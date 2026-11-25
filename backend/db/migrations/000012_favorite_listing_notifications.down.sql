DROP TABLE IF EXISTS favorite_listing_notification_deliveries;

ALTER TABLE favorite_businesses
    DROP COLUMN IF EXISTS notifications_enabled;
