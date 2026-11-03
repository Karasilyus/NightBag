package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"nightbag/internal/core/domain"
)

var _ domain.AuthRepository = (*BagRepository)(nil)

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (r *BagRepository) CreateAccount(ctx context.Context, in domain.RegisterInput, passwordHash string) (*domain.AuthUser, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var u domain.AuthUser
	err = tx.QueryRow(ctx, `
		INSERT INTO users (full_name, email, role, password_hash)
		VALUES ($1, $2, $3::text::user_role, $4)
		RETURNING id::text, full_name, email, role::text`,
		in.FullName, in.Email, in.Role, passwordHash,
	).Scan(&u.ID, &u.FullName, &u.Email, &u.Role)
	if isUniqueViolation(err) {
		return nil, domain.ErrEmailTaken
	}
	if err != nil {
		return nil, err
	}

	if in.Role == domain.RoleBusinessOwner && in.Business != nil {
		b := in.Business
		var bid string
		err = tx.QueryRow(ctx, `
			INSERT INTO businesses (owner_id, name, category, address, district, geom)
			VALUES ($1, $2, $3::text::bag_category, $4, NULLIF($5, ''),
			        ST_SetSRID(ST_MakePoint($6::float8, $7::float8), 4326))
			RETURNING id::text`,
			u.ID, b.Name, string(b.Category), b.Address, b.District, b.Lon, b.Lat,
		).Scan(&bid)
		if err != nil {
			return nil, err
		}
		u.BusinessID = &bid
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *BagRepository) GetCredentials(ctx context.Context, email string) (*domain.AuthUser, string, error) {
	var u domain.AuthUser
	var hash string
	err := r.pool.QueryRow(ctx, `
		SELECT u.id::text, u.full_name, u.email, u.role::text, COALESCE(u.password_hash, ''),
		       (SELECT b.id::text FROM businesses b
		         WHERE b.owner_id = u.id AND b.is_active
		         ORDER BY b.created_at LIMIT 1)
		FROM users u WHERE lower(u.email) = lower($1)`, email,
	).Scan(&u.ID, &u.FullName, &u.Email, &u.Role, &hash, &u.BusinessID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", domain.ErrUserNotFound
	}
	if err != nil {
		return nil, "", err
	}
	return &u, hash, nil
}

func (r *BagRepository) GetBusinessByOwner(ctx context.Context, ownerID string) (*domain.Business, error) {
	var b domain.Business
	err := r.pool.QueryRow(ctx, `
		SELECT id::text, name, category::text, COALESCE(description, ''), address,
		       COALESCE(district, ''), city, ST_X(geom)::float8, ST_Y(geom)::float8,
		       rating::float8, review_count::int
		FROM businesses
		WHERE owner_id = $1 AND is_active
		ORDER BY created_at LIMIT 1`, ownerID,
	).Scan(&b.ID, &b.Name, &b.Category, &b.Description, &b.Address, &b.District, &b.City, &b.Lon, &b.Lat, &b.Rating, &b.ReviewCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrBusinessNotFound
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *BagRepository) SetPasswordIfEmpty(ctx context.Context, email, passwordHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET password_hash = $2 WHERE lower(email) = lower($1) AND password_hash IS NULL`,
		strings.TrimSpace(email), passwordHash)
	return err
}

func (r *BagRepository) UpdatePasswordHash(ctx context.Context, userID, passwordHash string) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET password_hash = $2 WHERE id = $1`, userID, passwordHash)
	return err
}

func (r *BagRepository) GetAuthUser(ctx context.Context, id string) (*domain.AuthUser, error) {
	var u domain.AuthUser
	err := r.pool.QueryRow(ctx, `
		SELECT u.id::text, u.full_name, u.email, u.role::text,
		       (SELECT b.id::text FROM businesses b
		         WHERE b.owner_id = u.id AND b.is_active
		         ORDER BY b.created_at LIMIT 1)
		FROM users u WHERE u.id = $1`, id,
	).Scan(&u.ID, &u.FullName, &u.Email, &u.Role, &u.BusinessID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}
