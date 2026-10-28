package repository

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"nightbag/internal/core/domain"
)

type BagRepository struct {
	pool *pgxpool.Pool
}

func NewBagRepository(pool *pgxpool.Pool) *BagRepository {
	return &BagRepository{pool: pool}
}

var _ domain.BagRepository = (*BagRepository)(nil)

func newPickupCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("NB-%06d", n.Int64()), nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

// ---------- Listings ----------

func listingSelect(distanceExpr string) string {
	return `SELECT l.id::text, b.id::text, b.name, l.title, l.category::text,
		COALESCE(l.description, ''), l.content_tags, l.allergen_note,
		l.original_value::float8, l.price::float8, l.quantity_total, l.quantity_remaining,
		to_char(l.pickup_date, 'YYYY-MM-DD'), to_char(l.pickup_start, 'HH24:MI'), to_char(l.pickup_end, 'HH24:MI'),
		l.photo_url, l.status::text, ST_X(b.geom)::float8, ST_Y(b.geom)::float8, ` + distanceExpr + `
	FROM bag_listings l JOIN businesses b ON b.id = l.business_id `
}

func scanListing(row rowScanner) (domain.Listing, error) {
	var l domain.Listing
	var category string
	err := row.Scan(
		&l.ID, &l.BusinessID, &l.BusinessName, &l.Title, &category,
		&l.Description, &l.ContentTags, &l.AllergenNote,
		&l.OriginalValue, &l.Price, &l.QuantityTotal, &l.QuantityRemaining,
		&l.PickupDate, &l.PickupStart, &l.PickupEnd,
		&l.PhotoURL, &l.Status, &l.Lon, &l.Lat, &l.DistanceM,
	)
	l.Category = domain.BagCategory(category)
	if l.ContentTags == nil {
		l.ContentTags = []string{}
	}
	return l, err
}

func (r *BagRepository) NearbyListings(ctx context.Context, f domain.NearbyFilter) ([]domain.Listing, error) {
	const point = `ST_SetSRID(ST_MakePoint($1::float8, $2::float8), 4326)::geography`

	q := listingSelect("ST_Distance(b.geom::geography, "+point+")::float8") + `
	WHERE b.is_active
	  AND ST_DWithin(b.geom::geography, ` + point + `, $3::float8)
	  AND l.status = 'published'
	  AND l.quantity_remaining > 0
	  AND (l.pickup_date + l.pickup_end) > (now() AT TIME ZONE 'Europe/Istanbul')
	  AND ($4::text = '' OR l.category::text = $4::text)
	  AND ($5::text = '' OR b.name ILIKE '%' || $5::text || '%' OR l.title ILIKE '%' || $5::text || '%')
	ORDER BY 20, l.pickup_end
	LIMIT $6::int`

	rows, err := r.pool.Query(ctx, q, f.Lon, f.Lat, f.RadiusM, string(f.Category), f.Query, f.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []domain.Listing{}
	for rows.Next() {
		l, err := scanListing(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (r *BagRepository) GetListing(ctx context.Context, id string) (*domain.Listing, error) {
	q := listingSelect("NULL::float8") + ` WHERE l.id = $1`
	l, err := scanListing(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *BagRepository) CreateListing(ctx context.Context, in domain.CreateListingInput) (*domain.Listing, error) {
	if in.ContentTags == nil {
		in.ContentTags = []string{}
	}

	const q = `
	INSERT INTO bag_listings (business_id, title, category, description, content_tags, allergen_note,
		original_value, price, quantity_total, quantity_remaining,
		pickup_date, pickup_start, pickup_end, photo_url, status, published_at)
	SELECT b.id, $3::text, $4::text::bag_category, NULLIF($5::text, ''), $6::text[], $7::text,
		$8::numeric, $9::numeric, $10::int, $10::int,
		$11::date, $12::time, $13::time, $14::text, 'published'::listing_status, now()
	FROM businesses b
	WHERE b.id = $1 AND b.owner_id = $2 AND b.is_active AND b.category = $4::text::bag_category
	RETURNING id::text`

	var id string
	err := r.pool.QueryRow(ctx, q,
		in.BusinessID, in.OwnerID, in.Title, string(in.Category), in.Description, in.ContentTags,
		in.AllergenNote, in.OriginalValue, in.Price, in.Quantity,
		in.PickupDate, in.PickupStart, in.PickupEnd, in.PhotoURL,
	).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrForbidden // işletme yok ya da sahibi bu kullanıcı değil
	}
	if err != nil {
		return nil, err
	}
	return r.GetListing(ctx, id)
}

// ---------- Reservations ----------

const reservationSelect = `SELECT r.id::text, r.listing_id::text, b.name, b.address, l.title,
		to_char(l.pickup_date, 'YYYY-MM-DD'), to_char(l.pickup_start, 'HH24:MI'), to_char(l.pickup_end, 'HH24:MI'),
		r.quantity, r.unit_price::float8, r.total_price::float8, r.pickup_code, r.status::text,
		ST_X(b.geom)::float8, ST_Y(b.geom)::float8, r.created_at, r.picked_up_at
	FROM reservations r
	JOIN bag_listings l ON l.id = r.listing_id
	JOIN businesses  b ON b.id = l.business_id `

func scanReservation(row rowScanner) (domain.Reservation, error) {
	var x domain.Reservation
	err := row.Scan(
		&x.ID, &x.ListingID, &x.BusinessName, &x.BusinessAddress, &x.Title,
		&x.PickupDate, &x.PickupStart, &x.PickupEnd,
		&x.Quantity, &x.UnitPrice, &x.TotalPrice, &x.PickupCode, &x.Status,
		&x.Lon, &x.Lat, &x.CreatedAt, &x.PickedUpAt,
	)
	return x, err
}

func (r *BagRepository) getReservation(ctx context.Context, id string) (*domain.Reservation, error) {
	x, err := scanReservation(r.pool.QueryRow(ctx, reservationSelect+` WHERE r.id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrReservationNotFound
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func isForeignKeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23503"
}

// Reserve: stok kilidi + kod üretimi + stok düşümü tek transaction içinde.
func (r *BagRepository) Reserve(ctx context.Context, userID, listingID string, qty int) (*domain.Reservation, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var (
		price, original float64
		remaining       int
		status          string
		windowPassed    bool
		active          bool
	)
	err = tx.QueryRow(ctx, `
		SELECT l.price::float8, l.original_value::float8, l.quantity_remaining, l.status::text,
		       (l.pickup_date + l.pickup_end) <= (now() AT TIME ZONE 'Europe/Istanbul'),
		       b.is_active
		FROM bag_listings l JOIN businesses b ON b.id = l.business_id
		WHERE l.id = $1 FOR UPDATE OF l`, listingID,
	).Scan(&price, &original, &remaining, &status, &windowPassed, &active)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	switch {
	case status != "published", !active:
		return nil, domain.ErrListingNotAvailable
	case windowPassed:
		return nil, domain.ErrPickupWindowPassed
	case remaining < qty:
		return nil, domain.ErrInsufficientStock
	}

	// NB-#### kodu: bekleyen rezervasyonlar arasında benzersiz olana kadar dene.
	var resID string
	for attempt := 0; attempt < 20; attempt++ {
		code, cerr := newPickupCode()
		if cerr != nil {
			return nil, cerr
		}
		err = tx.QueryRow(ctx, `
			INSERT INTO reservations (user_id, listing_id, quantity, unit_price, unit_original_value, pickup_code, terms_accepted)
			VALUES ($1, $2, $3, $4, $5, $6, TRUE)
			ON CONFLICT (pickup_code) WHERE status = 'pending_pickup' DO NOTHING
			RETURNING id::text`,
			userID, listingID, qty, price, original, code,
		).Scan(&resID)
		if err == nil {
			break
		}
		if errors.Is(err, pgx.ErrNoRows) { // kod çakıştı, yenisini dene
			continue
		}
		if isForeignKeyViolation(err) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	if resID == "" {
		return nil, errors.New("teslim alma kodu üretilemedi")
	}

	_, err = tx.Exec(ctx, `
		UPDATE bag_listings
		   SET quantity_remaining = quantity_remaining - $2::int,
		       status = CASE WHEN quantity_remaining - $2::int = 0
		                     THEN 'sold_out'::listing_status ELSE status END
		 WHERE id = $1`, listingID, qty)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.getReservation(ctx, resID)
}

func (r *BagRepository) ListReservations(ctx context.Context, userID string, scope domain.ReservationScope) ([]domain.Reservation, error) {
	q := reservationSelect + ` WHERE r.user_id = $1`
	switch scope {
	case domain.ScopeActive:
		q += ` AND r.status = 'pending_pickup'`
	case domain.ScopePast:
		q += ` AND r.status <> 'pending_pickup'`
	}
	q += ` ORDER BY r.created_at DESC`

	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []domain.Reservation{}
	for rows.Next() {
		x, err := scanReservation(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

func (r *BagRepository) CancelReservation(ctx context.Context, userID, reservationID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var (
		listingID, status string
		qty               int
		windowPassed      bool
	)
	err = tx.QueryRow(ctx, `
		SELECT r.listing_id::text, r.quantity, r.status::text,
		       (l.pickup_date + l.pickup_end) <= (now() AT TIME ZONE 'Europe/Istanbul')
		FROM reservations r JOIN bag_listings l ON l.id = r.listing_id
		WHERE r.id = $1 AND r.user_id = $2 FOR UPDATE OF r`,
		reservationID, userID,
	).Scan(&listingID, &qty, &status, &windowPassed)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrReservationNotFound
	}
	if err != nil {
		return err
	}
	if status != "pending_pickup" {
		return domain.ErrNotCancellable
	}
	if windowPassed {
		return domain.ErrPickupWindowPassed
	}

	if _, err = tx.Exec(ctx,
		`UPDATE reservations SET status = 'cancelled', cancelled_at = now() WHERE id = $1`, reservationID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `
		UPDATE bag_listings
		   SET quantity_remaining = quantity_remaining + $2::int,
		       status = CASE WHEN status = 'sold_out' THEN 'published'::listing_status ELSE status END
		 WHERE id = $1`, listingID, qty); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// CompletePickup: işletme sahibi, müşterinin kodunu girerek teslimi tamamlar.
func (r *BagRepository) CompletePickup(ctx context.Context, ownerID, code string) (*domain.Reservation, error) {
	var id string
	err := r.pool.QueryRow(ctx, `
		UPDATE reservations r
		   SET status = 'picked_up', picked_up_at = now()
		  FROM bag_listings l
		  JOIN businesses b ON b.id = l.business_id
		 WHERE r.listing_id = l.id
		   AND b.owner_id = $1
		   AND r.pickup_code = $2
		   AND r.status = 'pending_pickup'
		RETURNING r.id::text`, ownerID, code,
	).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrReservationNotFound
	}
	if err != nil {
		return nil, err
	}
	return r.getReservation(ctx, id)
}

func (r *BagRepository) BusinessOverview(ctx context.Context, ownerID string) (*domain.BusinessOverview, error) {
	var o domain.BusinessOverview
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(l.quantity_total), 0)::int,
		       COALESCE(SUM(l.quantity_total - l.quantity_remaining), 0)::int,
		       COALESCE(SUM(l.quantity_remaining), 0)::int
		FROM bag_listings l
		JOIN businesses b ON b.id = l.business_id
		WHERE b.owner_id = $1
		  AND l.status <> 'draft'
		  AND l.pickup_date = (now() AT TIME ZONE 'Europe/Istanbul')::date`, ownerID,
	).Scan(&o.Published, &o.Reserved, &o.Remaining)
	if err != nil {
		return nil, err
	}
	return &o, nil
}
