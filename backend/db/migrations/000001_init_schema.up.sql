CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_role          AS ENUM ('customer', 'business_owner');
CREATE TYPE bag_category       AS ENUM ('firin', 'kafe', 'yemek');
CREATE TYPE listing_status     AS ENUM ('draft', 'published', 'sold_out', 'closed');
CREATE TYPE reservation_status AS ENUM ('pending_pickup', 'picked_up', 'cancelled', 'expired');

CREATE TABLE users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name             TEXT        NOT NULL,
    email                 TEXT        NOT NULL UNIQUE,
    phone                 TEXT,
    role                  user_role   NOT NULL DEFAULT 'customer',
    notifications_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
    search_radius_m       INTEGER     NOT NULL DEFAULT 5000 CHECK (search_radius_m BETWEEN 500 AND 50000),
    last_location         GEOMETRY(Point, 4326),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_last_location ON users USING GIST (last_location);

CREATE TABLE businesses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name        TEXT         NOT NULL,
    category    bag_category NOT NULL,
    description TEXT,
    address     TEXT         NOT NULL,
    district    TEXT,
    city        TEXT         NOT NULL DEFAULT 'İstanbul',
    geom        GEOMETRY(Point, 4326) NOT NULL,
    photo_url   TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_businesses_geom     ON businesses USING GIST (geom);
CREATE INDEX idx_businesses_geog     ON businesses USING GIST ((geom::geography));
CREATE INDEX idx_businesses_owner    ON businesses (owner_id);

CREATE TABLE bag_listings (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id        UUID           NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title              TEXT           NOT NULL,
    category           bag_category   NOT NULL,
    description        TEXT,
    content_tags       TEXT[]         NOT NULL DEFAULT '{}',
    allergen_note      TEXT,
    original_value     NUMERIC(10,2)  NOT NULL CHECK (original_value > 0),
    price              NUMERIC(10,2)  NOT NULL CHECK (price > 0),
    quantity_total     INTEGER        NOT NULL CHECK (quantity_total > 0),
    quantity_remaining INTEGER        NOT NULL CHECK (quantity_remaining >= 0),
    pickup_date        DATE           NOT NULL,
    pickup_start       TIME           NOT NULL,
    pickup_end         TIME           NOT NULL,
    photo_url          TEXT,
    status             listing_status NOT NULL DEFAULT 'draft',
    published_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT chk_price_le_value     CHECK (price <= original_value),
    CONSTRAINT chk_remaining_le_total CHECK (quantity_remaining <= quantity_total),
    CONSTRAINT chk_pickup_window      CHECK (pickup_end > pickup_start)
);
CREATE INDEX idx_listings_business ON bag_listings (business_id);
CREATE INDEX idx_listings_active   ON bag_listings (pickup_date, category)
    WHERE status = 'published' AND quantity_remaining > 0;

CREATE TABLE reservations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID               NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    listing_id          UUID               NOT NULL REFERENCES bag_listings(id) ON DELETE RESTRICT,
    quantity            INTEGER            NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 4),
    unit_price          NUMERIC(10,2)      NOT NULL,
    unit_original_value NUMERIC(10,2)      NOT NULL,
    total_price         NUMERIC(10,2)      GENERATED ALWAYS AS (quantity * unit_price) STORED,
    pickup_code         TEXT               NOT NULL,
    status              reservation_status NOT NULL DEFAULT 'pending_pickup',
    terms_accepted      BOOLEAN            NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ        NOT NULL DEFAULT now(),
    picked_up_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    CONSTRAINT chk_terms CHECK (terms_accepted)
);
CREATE INDEX idx_reservations_user    ON reservations (user_id, status, created_at DESC);
CREATE INDEX idx_reservations_listing ON reservations (listing_id, status);
CREATE UNIQUE INDEX uq_reservations_active_code
    ON reservations (pickup_code) WHERE status = 'pending_pickup';

CREATE TABLE favorite_businesses (
    user_id     UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    business_id UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, business_id)
);