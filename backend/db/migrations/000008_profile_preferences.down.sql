ALTER TABLE businesses
    DROP COLUMN IF EXISTS phone;

ALTER TABLE users
    DROP COLUMN IF EXISTS location_label,
    DROP COLUMN IF EXISTS favorite_categories;
