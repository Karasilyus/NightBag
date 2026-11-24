CREATE TABLE device_push_tokens (
    expo_push_token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_push_tokens_user ON device_push_tokens (user_id);

CREATE TABLE notification_deliveries (
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL REFERENCES device_push_tokens(expo_push_token) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    PRIMARY KEY (reservation_id, expo_push_token)
);
