package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func EnsureDemoListing(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO bag_listings (business_id, title, category, original_value, price,
		                          quantity_total, quantity_remaining,
		                          pickup_date, pickup_start, pickup_end, status, published_at)
		SELECT b.id, 'Fırın sürpriz çantası', 'firin'::bag_category, 350.00, 125.00, 12, 12,
		       (now() AT TIME ZONE 'Europe/Istanbul')::date, '18:00'::time, '23:59'::time,
		       'published'::listing_status, now()
		FROM businesses b
		WHERE b.id = '33333333-3333-3333-3333-333333333333'
		  AND NOT EXISTS (
		        SELECT 1 FROM bag_listings l
		         WHERE l.business_id = b.id
		           AND l.pickup_date = (now() AT TIME ZONE 'Europe/Istanbul')::date
		           AND l.status IN ('published', 'sold_out'))`)
	return err
}
