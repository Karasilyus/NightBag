ALTER TABLE users
    ADD COLUMN IF NOT EXISTS favorite_categories TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS location_label TEXT;

ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS phone TEXT;
