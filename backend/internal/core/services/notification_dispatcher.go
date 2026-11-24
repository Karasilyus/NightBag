package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const expoPushEndpoint = "https://exp.host/--/api/v2/push/send"

type NotificationDispatcher struct {
	pool        *pgxpool.Pool
	client      *http.Client
	accessToken string
}

func NewNotificationDispatcher(pool *pgxpool.Pool, accessToken string) *NotificationDispatcher {
	return &NotificationDispatcher{
		pool:        pool,
		client:      &http.Client{Timeout: 10 * time.Second},
		accessToken: accessToken,
	}
}

func (d *NotificationDispatcher) Run(ctx context.Context) {
	d.dispatchDue(ctx)
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			d.dispatchDue(ctx)
		}
	}
}

func (d *NotificationDispatcher) dispatchDue(ctx context.Context) {
	rows, err := d.pool.Query(ctx, `
		INSERT INTO notification_deliveries (reservation_id, expo_push_token, claimed_at)
		SELECT r.id, dpt.expo_push_token, now()
		FROM reservations r
		JOIN users u ON u.id = r.user_id AND u.notifications_enabled
		JOIN bag_listings l ON l.id = r.listing_id
		JOIN device_push_tokens dpt ON dpt.user_id = u.id
		WHERE r.status = 'pending_pickup'
		  AND (l.pickup_date + l.pickup_start)
		      <= (now() AT TIME ZONE 'Europe/Istanbul') + interval '30 minutes'
		  AND (l.pickup_date + l.pickup_end) > (now() AT TIME ZONE 'Europe/Istanbul')
		ON CONFLICT (reservation_id, expo_push_token) DO UPDATE
		SET claimed_at = EXCLUDED.claimed_at
		WHERE notification_deliveries.sent_at IS NULL
		  AND notification_deliveries.claimed_at < now() - interval '5 minutes'
		RETURNING reservation_id::text, expo_push_token`)
	if err != nil {
		log.Printf("bildirim işleri alınamadı: %v", err)
		return
	}

	type delivery struct {
		reservationID string
		token         string
	}
	var deliveries []delivery
	for rows.Next() {
		var item delivery
		if err := rows.Scan(&item.reservationID, &item.token); err != nil {
			rows.Close()
			log.Printf("bildirim işi okunamadı: %v", err)
			return
		}
		deliveries = append(deliveries, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		log.Printf("bildirim işleri okunamadı: %v", err)
		return
	}
	rows.Close()

	for _, item := range deliveries {
		if err := d.dispatchReservation(ctx, item.reservationID, item.token); err != nil {
			log.Printf("rezervasyon bildirimi gönderilemedi (%s): %v", item.reservationID, err)
		}
	}
}

func (d *NotificationDispatcher) dispatchReservation(ctx context.Context, reservationID, token string) error {
	var userID, businessName, title, pickupStart string
	err := d.pool.QueryRow(ctx, `
		SELECT r.user_id::text, b.name, l.title, to_char(l.pickup_start, 'HH24:MI')
		FROM reservations r
		JOIN users u ON u.id = r.user_id AND u.notifications_enabled
		JOIN bag_listings l ON l.id = r.listing_id
		JOIN businesses b ON b.id = l.business_id
		JOIN device_push_tokens dpt ON dpt.user_id = u.id AND dpt.expo_push_token = $2
		WHERE r.id = $1 AND r.status = 'pending_pickup'
		  AND (l.pickup_date + l.pickup_start)
		      <= (now() AT TIME ZONE 'Europe/Istanbul') + interval '30 minutes'
		  AND (l.pickup_date + l.pickup_end) > (now() AT TIME ZONE 'Europe/Istanbul')`,
		reservationID, token,
	).Scan(&userID, &businessName, &title, &pickupStart)
	if errors.Is(err, pgx.ErrNoRows) {
		_, deleteErr := d.pool.Exec(ctx, `
			DELETE FROM notification_deliveries
			WHERE reservation_id = $1 AND expo_push_token = $2 AND sent_at IS NULL`,
			reservationID, token)
		return deleteErr
	}
	if err != nil {
		return err
	}

	body := fmt.Sprintf("%s işletmesinden %s çantanı saat %s'ye kadar teslim almayı unutma.", businessName, title, pickupStart)
	delivered, invalidToken, sendErr := d.sendPush(ctx, token, body, reservationID)
	if invalidToken {
		if _, err := d.pool.Exec(ctx, `
			DELETE FROM device_push_tokens WHERE user_id = $1 AND expo_push_token = $2`,
			userID, token); err != nil {
			log.Printf("geçersiz push token silinemedi: %v", err)
		}
	}
	if !delivered {
		if sendErr != nil {
			log.Printf("Expo push gönderimi başarısız (%s): %v", reservationID, sendErr)
		}
		_, err := d.pool.Exec(ctx, `
			UPDATE notification_deliveries
			SET claimed_at = now() - interval '6 minutes'
			WHERE reservation_id = $1 AND expo_push_token = $2 AND sent_at IS NULL`,
			reservationID, token)
		return err
	}

	_, err = d.pool.Exec(ctx, `
		UPDATE notification_deliveries SET sent_at = now()
		WHERE reservation_id = $1 AND expo_push_token = $2 AND sent_at IS NULL`,
		reservationID, token)
	return err
}

func (d *NotificationDispatcher) sendPush(ctx context.Context, token, body, reservationID string) (bool, bool, error) {
	payload, err := json.Marshal(map[string]any{
		"to":    token,
		"title": "Teslim saatin yaklaşıyor",
		"body":  body,
		"sound": "default",
		"data":  map[string]string{"reservationId": reservationID},
	})
	if err != nil {
		return false, false, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, expoPushEndpoint, bytes.NewReader(payload))
	if err != nil {
		return false, false, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	if d.accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+d.accessToken)
	}

	res, err := d.client.Do(req)
	if err != nil {
		return false, false, err
	}
	defer res.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return false, false, err
	}
	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		return false, false, fmt.Errorf("Expo push HTTP %d: %s", res.StatusCode, string(responseBody))
	}

	var response struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(responseBody, &response); err != nil {
		return false, false, err
	}
	var tickets []struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Details struct {
			Error string `json:"error"`
		} `json:"details"`
	}
	if len(response.Data) > 0 && response.Data[0] == '[' {
		if err := json.Unmarshal(response.Data, &tickets); err != nil {
			return false, false, err
		}
	} else {
		var ticket struct {
			Status  string `json:"status"`
			Message string `json:"message"`
			Details struct {
				Error string `json:"error"`
			} `json:"details"`
		}
		if err := json.Unmarshal(response.Data, &ticket); err != nil {
			return false, false, err
		}
		tickets = append(tickets, ticket)
	}
	for _, ticket := range tickets {
		if ticket.Status == "ok" {
			return true, false, nil
		}
		if ticket.Details.Error == "DeviceNotRegistered" {
			return false, true, nil
		}
		if ticket.Status != "" {
			return false, false, fmt.Errorf("Expo push bileti başarısız: %s", ticket.Message)
		}
	}
	return false, false, errors.New("Expo push yanıtında bilet bulunamadı")
}
