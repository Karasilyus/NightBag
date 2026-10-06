-- PostgreSQL veritabanı şeması (NightBag)
-- PostGIS eklentisinin aktif olması gerekmektedir (Konum bazlı aramalar için)
-- CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE reservation_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE user_role AS ENUM ('customer', 'business');

-- Kullanıcılar Tablosu
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İşletmeler Tablosu
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    -- PostGIS için geometrik veri tipi (Uygulama anında ST_GeomFromText ile doldurulabilir)
    location geometry(Point, 4326),
    cover_image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İşletmelerin konumlarına göre hızlı arama yapabilmek için GIST indexi
CREATE INDEX businesses_location_idx ON businesses USING GIST (location);

-- Sürpriz Çantalar Tablosu
CREATE TABLE surprise_bags (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    pickup_start_time TIME NOT NULL,
    pickup_end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rezervasyonlar Tablosu
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bag_id INTEGER REFERENCES surprise_bags(id) ON DELETE CASCADE,
    reservation_code VARCHAR(20) UNIQUE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    status reservation_status DEFAULT 'pending',
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Sahte (Mock) Veriler Ekleme (Test Amaçlı)
INSERT INTO users (email, password_hash, full_name, role) VALUES 
('customer@test.com', 'hashed_pass_here', 'Ali Veli', 'customer'),
('business@test.com', 'hashed_pass_here', 'Moda Fırını Sahibi', 'business');

INSERT INTO businesses (owner_id, name, address, latitude, longitude) VALUES 
(2, 'Moda Fırını', 'Caferağa Mah. Moda Cad. No: 42, Kadıköy', 40.9845, 29.0260);

INSERT INTO surprise_bags (business_id, title, price, original_price, quantity, pickup_start_time, pickup_end_time) VALUES 
(1, 'Fırın Sürpriz Çantası', 125.00, 300.00, 5, '20:00', '21:00');

INSERT INTO reservations (user_id, bag_id, reservation_code, quantity, total_price, status) VALUES 
(1, 1, 'NB-4826', 1, 125.00, 'pending');
