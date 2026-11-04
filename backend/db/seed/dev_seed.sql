INSERT INTO users (id, full_name, email, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Müşteri', 'musteri@nightbag.com', 'customer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, full_name, email, role)
VALUES ('22222222-2222-2222-2222-222222222222', 'Elif Yılmaz', 'elif@modafirini.com', 'business_owner')
ON CONFLICT (email) DO NOTHING;

INSERT INTO businesses (id, owner_id, name, category, description, address, district, city, geom, is_active)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'Moda Fırını',
    'firin',
    'Günlük taze unlu mamuller',
    'Moda Cd. No:1',
    'Kadıköy',
    'İstanbul',
    ST_SetSRID(ST_MakePoint(29.025, 40.980), 4326),
    TRUE
)
ON CONFLICT DO NOTHING;

INSERT INTO bag_listings (business_id, title, category, original_value, price, quantity_total, quantity_remaining, pickup_date, pickup_start, pickup_end, status)
SELECT '33333333-3333-3333-3333-333333333333',
       'Fırın sürpriz çantası',
       'firin',
       350.00,
       125.00,
       12,
       12,
       (now() AT TIME ZONE 'Europe/Istanbul')::date,
       '20:00',
       '21:00',
       'published'
WHERE NOT EXISTS (
    SELECT 1
    FROM bag_listings
    WHERE business_id = '33333333-3333-3333-3333-333333333333'
      AND pickup_date = (now() AT TIME ZONE 'Europe/Istanbul')::date
      AND status IN ('published', 'sold_out')
);
