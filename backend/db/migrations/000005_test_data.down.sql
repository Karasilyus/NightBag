DELETE FROM reservations WHERE id::text LIKE 'e1e1e1e1-%';
DELETE FROM bag_listings WHERE id::text LIKE 'd1d1d1d1-%';
DELETE FROM businesses WHERE id::text LIKE 'b2b2b2b2-%';
DELETE FROM users WHERE id::text LIKE 'a1a1a1a1-%' OR id::text LIKE 'c1c1c1c1-%';
