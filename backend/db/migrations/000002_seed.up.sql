-- 1. Eksik kategoriyi ekleyelim (Frontend'deki 'Tatlı' seçeneği için)
ALTER TYPE bag_category ADD VALUE IF NOT EXISTS 'tatli';

-- 2. Test Müşterisi (Frontend'de X-User-ID olarak bu UUID'yi kullanacaksın)
INSERT INTO users (id, full_name, email, role) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Müşteri', 'musteri@nightbag.com', 'customer')
ON CONFLICT (email) DO NOTHING;

-- 3. İşletme Sahibi (Figma tasarımındaki Elif Yılmaz)
INSERT INTO users (id, full_name, email, role) 
VALUES ('22222222-2222-2222-2222-222222222222', 'Elif Yılmaz', 'elif@modafirini.com', 'business_owner')
ON CONFLICT (email) DO NOTHING;

-- 4. İşletme (Figma tasarımındaki Moda Fırını)
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

-- 5. Sürpriz Çanta İlanı (Figma tasarımındaki 125₺'lik çanta)
INSERT INTO bag_listings (business_id, title, category, original_value, price, quantity_total, quantity_remaining, pickup_date, pickup_start, pickup_end, status)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Fırın sürpriz çantası',
    'firin',
    350.00,
    125.00,
    12,
    8,
    CURRENT_DATE,
    '20:00',
    '21:00',
    'published'
);

ALTER TABLE businesses ADD COLUMN rating NUMERIC(3,2) NOT NULL DEFAULT 0.00;
ALTER TABLE businesses ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;