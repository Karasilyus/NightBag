ALTER TABLE favorite_businesses
    ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE favorite_listing_notification_deliveries (
    listing_id UUID NOT NULL REFERENCES bag_listings(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL REFERENCES device_push_tokens(expo_push_token) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    PRIMARY KEY (listing_id, expo_push_token)
);

CREATE INDEX idx_favorite_listing_notifications_pending
    ON favorite_listing_notification_deliveries (claimed_at)
    WHERE sent_at IS NULL;
