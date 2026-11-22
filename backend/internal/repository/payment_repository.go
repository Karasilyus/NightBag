package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"nightbag/internal/core/domain"
)

type PendingPayment struct {
	OrderID        string
	ConversationID string
	ListingID      string
	UnitPrice      float64
	OriginalValue  float64
	TotalAmount    float64
	ListingTitle   string
	BuyerName      string
	BuyerEmail     string
}

type ReservationRefund struct {
	OrderID        string
	ConversationID string
	PaymentID      string
	Amount         float64
}

type PaymentRepository struct {
	pool *pgxpool.Pool
}

func (r *PaymentRepository) BeginReservationCancellation(ctx context.Context, userID, reservationID string) (*ReservationRefund, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var listingID, reservationStatus string
	var quantity int
	var windowPassed bool
	err = tx.QueryRow(ctx, `
		SELECT r.listing_id::text, r.quantity, r.status::text,
		       (l.pickup_date + l.pickup_end) <= (now() AT TIME ZONE 'Europe/Istanbul')
		FROM reservations r
		JOIN bag_listings l ON l.id = r.listing_id
		WHERE r.id = $1 AND r.user_id = $2
		FOR UPDATE OF r`, reservationID, userID).Scan(
		&listingID, &quantity, &reservationStatus, &windowPassed,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrReservationNotFound
	}
	if err != nil {
		return nil, err
	}
	if reservationStatus != "pending_pickup" {
		return nil, domain.ErrNotCancellable
	}
	if windowPassed {
		return nil, domain.ErrPickupWindowPassed
	}

	var orderID, paymentID, paymentStatus, refundStatus string
	var amount float64
	var retryable bool
	err = tx.QueryRow(ctx, `
		SELECT id::text, COALESCE(payment_id, ''), status, COALESCE(refund_status, ''),
		       total_amount::float8, refund_retryable
		FROM payment_orders
		WHERE reservation_id = $1
		FOR UPDATE`, reservationID).Scan(
		&orderID, &paymentID, &paymentStatus, &refundStatus, &amount, &retryable,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		if err := cancelReservationAndRestoreStock(ctx, tx, reservationID, listingID, quantity); err != nil {
			return nil, err
		}
		return nil, tx.Commit(ctx)
	}
	if err != nil {
		return nil, err
	}
	if paymentStatus != "paid" {
		return nil, domain.ErrNotCancellable
	}
	switch refundStatus {
	case "pending", "unknown":
		return nil, domain.ErrRefundPending
	case "refunded":
		return nil, domain.ErrNotCancellable
	case "failed":
		if !retryable {
			return nil, domain.ErrRefundNotRetryable
		}
	}
	if paymentID == "" {
		return nil, errors.New("ödeme sağlayıcısının ödeme kimliği bulunamadı")
	}

	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, err
	}
	conversationID := "refund-" + hex.EncodeToString(randomBytes)
	if _, err := tx.Exec(ctx, `
		UPDATE payment_orders
		SET refund_status = 'pending', refund_conversation_id = $2,
		    refund_error = NULL, refund_retryable = FALSE, updated_at = now()
		WHERE id = $1`, orderID, conversationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &ReservationRefund{
		OrderID: orderID, ConversationID: conversationID, PaymentID: paymentID, Amount: amount,
	}, nil
}

func cancelReservationAndRestoreStock(ctx context.Context, tx pgx.Tx, reservationID, listingID string, quantity int) error {
	if _, err := tx.Exec(ctx, `
		UPDATE reservations
		SET status = 'cancelled', cancelled_at = now()
		WHERE id = $1 AND status = 'pending_pickup'`, reservationID); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `
		UPDATE bag_listings
		SET quantity_remaining = quantity_remaining + $2,
		    status = CASE WHEN status = 'sold_out' THEN 'published'::listing_status ELSE status END
		WHERE id = $1`, listingID, quantity)
	return err
}

func (r *PaymentRepository) SetRefundOutcome(ctx context.Context, orderID, conversationID, status, message string, retryable bool) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE payment_orders
		SET refund_status = $3, refund_error = LEFT($4, 500),
		    refund_retryable = $5, updated_at = now()
		WHERE id = $1 AND refund_conversation_id = $2 AND refund_status = 'pending'`,
		orderID, conversationID, status, message, retryable)
	return err
}

func (r *PaymentRepository) CompleteRefund(ctx context.Context, orderID, conversationID, providerPaymentID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var reservationID string
	err = tx.QueryRow(ctx, `
		SELECT reservation_id::text
		FROM payment_orders po
		WHERE po.id = $1 AND po.refund_conversation_id = $2
		  AND po.refund_status = 'pending'`, orderID, conversationID).Scan(&reservationID)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	if err != nil {
		return err
	}

	var listingID, reservationStatus string
	var quantity int
	var windowPassed bool
	err = tx.QueryRow(ctx, `
		SELECT r.listing_id::text, r.quantity, r.status::text,
		       (l.pickup_date + l.pickup_end) <= (now() AT TIME ZONE 'Europe/Istanbul')
		FROM reservations r
		JOIN bag_listings l ON l.id = r.listing_id
		WHERE r.id = $1
		FOR UPDATE OF r`, reservationID).Scan(&listingID, &quantity, &reservationStatus, &windowPassed)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrReservationNotFound
	}
	if err != nil {
		return err
	}
	var storedPaymentID string
	if err = tx.QueryRow(ctx, `
		SELECT payment_id FROM payment_orders
		WHERE id = $1 AND refund_conversation_id = $2
		  AND refund_status = 'pending'
		FOR UPDATE`, orderID, conversationID).Scan(&storedPaymentID); err != nil {
		return err
	}
	if storedPaymentID != providerPaymentID {
		return domain.ErrNotFound
	}
	if reservationStatus != "pending_pickup" && reservationStatus != "expired" {
		return domain.ErrNotCancellable
	}

	if _, err = tx.Exec(ctx, `
		UPDATE payment_orders
		SET refund_status = 'refunded', refund_error = NULL,
		    refund_retryable = FALSE, refunded_at = now(), updated_at = now()
		WHERE id = $1`, orderID); err != nil {
		return err
	}
	if reservationStatus == "pending_pickup" {
		if _, err = tx.Exec(ctx, `
			UPDATE reservations SET status = 'cancelled', cancelled_at = now()
			WHERE id = $1 AND status = 'pending_pickup'`, reservationID); err != nil {
			return err
		}
	}
	if reservationStatus == "pending_pickup" && !windowPassed {
		if _, err = tx.Exec(ctx, `
			UPDATE bag_listings
			SET quantity_remaining = quantity_remaining + $2,
			    status = CASE WHEN status = 'sold_out' THEN 'published'::listing_status ELSE status END
			WHERE id = $1`, listingID, quantity); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func NewPaymentRepository(pool *pgxpool.Pool) *PaymentRepository {
	return &PaymentRepository{pool: pool}
}

func (r *PaymentRepository) CreatePendingPayment(ctx context.Context, userID, listingID string, quantity int, acceptedTerms bool) (*PendingPayment, error) {
	if quantity < 1 || quantity > 4 {
		return nil, fmt.Errorf("%w: adet 1 ile 4 arasında olmalı", domain.ErrInvalidInput)
	}
	if !acceptedTerms {
		return nil, fmt.Errorf("%w: rezervasyon şartlarını onaylamanız gerekiyor", domain.ErrInvalidInput)
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var buyerName, buyerEmail string
	if err := tx.QueryRow(ctx, `SELECT full_name, email FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&buyerName, &buyerEmail); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	var activeBags int
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(quantity), 0)::int
		FROM reservations
		WHERE user_id = $1 AND status = 'pending_pickup'`, userID).Scan(&activeBags); err != nil {
		return nil, err
	}
	if activeBags+quantity > domain.MaxActiveReservationBags {
		return nil, domain.ErrReservationLimit
	}

	var (
		price, original float64
		remaining       int
		status          string
		windowPassed    bool
		active          bool
		ownerID         string
		title           string
	)
	err = tx.QueryRow(ctx, `
		SELECT l.price::float8, l.original_value::float8, l.quantity_remaining, l.status::text,
		       (l.pickup_date + l.pickup_end) <= (now() AT TIME ZONE 'Europe/Istanbul'),
		       b.is_active, b.owner_id::text, l.title
		FROM bag_listings l JOIN businesses b ON b.id = l.business_id
		WHERE l.id = $1 FOR UPDATE OF l`, listingID).Scan(
		&price, &original, &remaining, &status, &windowPassed, &active, &ownerID, &title,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	switch {
	case ownerID == userID:
		return nil, domain.ErrOwnListing
	case status != "published" || !active:
		return nil, domain.ErrListingNotAvailable
	case windowPassed:
		return nil, domain.ErrPickupWindowPassed
	case remaining < quantity:
		return nil, domain.ErrInsufficientStock
	}

	if _, err = tx.Exec(ctx, `
		UPDATE bag_listings
		SET quantity_remaining = quantity_remaining - $2,
		    status = CASE WHEN quantity_remaining - $2 = 0 THEN 'sold_out'::listing_status ELSE status END
		WHERE id = $1`, listingID, quantity); err != nil {
		return nil, err
	}

	total := price * float64(quantity)
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, err
	}
	conversationID := "nightbag-" + hex.EncodeToString(randomBytes)
	var orderID string
	err = tx.QueryRow(ctx, `
		INSERT INTO payment_orders
		    (user_id, listing_id, quantity, unit_price, total_amount, conversation_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text`, userID, listingID, quantity, price, total, conversationID).Scan(&orderID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &PendingPayment{
		OrderID: orderID, ConversationID: conversationID, ListingID: listingID, UnitPrice: price,
		OriginalValue: original, TotalAmount: total, ListingTitle: title,
		BuyerName: buyerName, BuyerEmail: buyerEmail,
	}, nil
}

func (r *PaymentRepository) SavePaymentToken(ctx context.Context, orderID, token, pageURL, checkoutForm string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE payment_orders
		SET provider_token = $2, raw_callback = $3, updated_at = now()
		WHERE id = $1 AND status = 'pending_payment'`, orderID, token, checkoutForm)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("ödeme emri bulunamadı veya zaten sonlanmış")
	}
	return nil
}

func (r *PaymentRepository) FailPendingByConversation(ctx context.Context, conversationID, rawPayload string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var orderID, listingID string
	var quantity int
	err = tx.QueryRow(ctx, `
		SELECT id::text, listing_id::text, quantity
		FROM payment_orders
		WHERE conversation_id = $1 AND status = 'pending_payment'
		FOR UPDATE`, conversationID).Scan(&orderID, &listingID, &quantity)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `
		UPDATE payment_orders SET status = 'failed', raw_callback = $2, updated_at = now()
		WHERE id = $1`, orderID, rawPayload); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `
		UPDATE bag_listings
		SET quantity_remaining = quantity_remaining + $2,
		    status = CASE WHEN status = 'sold_out' THEN 'published'::listing_status ELSE status END
		WHERE id = $1`, listingID, quantity); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *PaymentRepository) FinalizeByToken(ctx context.Context, token, providerPaymentID string, success bool, rawPayload string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var orderID, userID, listingID, status string
	var quantity int
	var unitPrice float64
	err = tx.QueryRow(ctx, `
		SELECT po.id::text, po.user_id::text, po.listing_id::text, po.status,
		       po.quantity, po.unit_price::float8
		FROM payment_orders po
		WHERE po.provider_token = $1
		FOR UPDATE OF po`, token).Scan(
		&orderID, &userID, &listingID, &status, &quantity, &unitPrice,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	if err != nil {
		return err
	}
	if status == "paid" {
		return tx.Commit(ctx)
	}
	if status != "pending_payment" {
		return tx.Commit(ctx)
	}

	if !success {
		if _, err = tx.Exec(ctx, `
			UPDATE payment_orders SET status = 'failed', payment_id = NULLIF($2,''),
			    raw_callback = $3, updated_at = now() WHERE id = $1`,
			orderID, providerPaymentID, rawPayload); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `
			UPDATE bag_listings
			SET quantity_remaining = quantity_remaining + $2,
			    status = CASE WHEN status = 'sold_out' THEN 'published'::listing_status ELSE status END
			WHERE id = $1`, listingID, quantity); err != nil {
			return err
		}
		return tx.Commit(ctx)
	}

	var originalValue float64
	if err = tx.QueryRow(ctx, `SELECT original_value::float8 FROM bag_listings WHERE id = $1`, listingID).Scan(&originalValue); err != nil {
		return err
	}

	var reservationID string
	for attempt := 0; attempt < 20; attempt++ {
		code, codeErr := newPickupCode()
		if codeErr != nil {
			return codeErr
		}
		err = tx.QueryRow(ctx, `
			INSERT INTO reservations
			    (user_id, listing_id, quantity, unit_price, unit_original_value, pickup_code, terms_accepted)
			VALUES ($1, $2, $3, $4, $5, $6, TRUE)
			ON CONFLICT (pickup_code) WHERE status = 'pending_pickup' DO NOTHING
			RETURNING id::text`,
			userID, listingID, quantity, unitPrice, originalValue, code).Scan(&reservationID)
		if err == nil {
			break
		}
		if errors.Is(err, pgx.ErrNoRows) {
			continue
		}
		return err
	}
	if reservationID == "" {
		return errors.New("teslim alma kodu üretilemedi")
	}

	if _, err = tx.Exec(ctx, `
		UPDATE payment_orders
		SET status = 'paid', payment_id = NULLIF($2,''), reservation_id = $3,
		    raw_callback = $4, updated_at = now()
		WHERE id = $1`, orderID, providerPaymentID, reservationID, rawPayload); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *PaymentRepository) GetStatus(ctx context.Context, userID, orderID string) (*domain.PaymentOrderStatus, error) {
	var status string
	var reservationID *string
	err := r.pool.QueryRow(ctx, `
		SELECT status, reservation_id::text
		FROM payment_orders
		WHERE id = $1 AND user_id = $2`, orderID, userID).Scan(&status, &reservationID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &domain.PaymentOrderStatus{OrderID: orderID, Status: status, ReservationID: reservationID}, nil
}

func (r *PaymentRepository) GetCheckoutForm(ctx context.Context, token string) (string, error) {
	var form string
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(raw_callback, '')
		FROM payment_orders
		WHERE provider_token = $1 AND status = 'pending_payment'`, token).Scan(&form)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.ErrNotFound
	}
	if err != nil {
		return "", err
	}
	if form == "" {
		return "", errors.New("iyzico ödeme formu bulunamadı")
	}
	return form, nil
}

func (r *PaymentRepository) ExpirePending(ctx context.Context) error {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, listing_id::text, quantity
		FROM payment_orders
		WHERE status = 'pending_payment' AND expires_at <= now()
		FOR UPDATE`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type expiredOrder struct {
		orderID, listingID string
		quantity           int
	}
	expired := []expiredOrder{}
	for rows.Next() {
		var item expiredOrder
		if err := rows.Scan(&item.orderID, &item.listingID, &item.quantity); err != nil {
			return err
		}
		expired = append(expired, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, item := range expired {
		if _, err = tx.Exec(ctx, `
			UPDATE payment_orders SET status = 'expired', updated_at = now()
			WHERE id = $1 AND status = 'pending_payment'`, item.orderID); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `
			UPDATE bag_listings
			SET quantity_remaining = quantity_remaining + $2,
			    status = CASE WHEN status = 'sold_out' THEN 'published'::listing_status ELSE status END
			WHERE id = $1`, item.listingID, item.quantity); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
