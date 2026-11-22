CREATE TABLE payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    listing_id UUID NOT NULL REFERENCES bag_listings(id) ON DELETE RESTRICT,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 4),
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN ('pending_payment', 'paid', 'failed', 'cancelled', 'expired')),
    conversation_id TEXT NOT NULL UNIQUE,
    provider_token TEXT UNIQUE,
    payment_id TEXT,
    raw_callback TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_orders_user ON payment_orders(user_id, created_at DESC);
CREATE INDEX idx_payment_orders_listing ON payment_orders(listing_id);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
