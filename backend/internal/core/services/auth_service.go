package services

import (
	"context"
	"crypto/hmac"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"nightbag/internal/core/domain"
)

const (
	pbkdf2Iter          = 600_000
	maxStoredPBKDF2Iter = 2_000_000
	minPasswordLen      = 8
	maxPasswordLen      = 128
	tokenTTL            = 30 * 24 * time.Hour
)

var dummyHash, _ = hashPassword("dummy-password-for-timing")

var (
	emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
	b64          = base64.RawURLEncoding
)

type AuthService struct {
	repo   domain.AuthRepository
	secret []byte
}

func NewAuthService(repo domain.AuthRepository, secret string) *AuthService {
	return &AuthService{repo: repo, secret: []byte(secret)}
}

// ---------- şifre ----------

func hashPassword(pw string) (string, error) {
	return hashPasswordWithIterations(pw, pbkdf2Iter)
}

func hashPasswordWithIterations(pw string, iterations int) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key, err := pbkdf2.Key(sha256.New, pw, salt, iterations, 32)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("pbkdf2$%d$%s$%s", iterations, b64.EncodeToString(salt), b64.EncodeToString(key)), nil
}

func parsePasswordHash(stored string) (int, []byte, []byte, bool) {
	parts := strings.Split(stored, "$")
	if len(parts) != 4 || parts[0] != "pbkdf2" {
		return 0, nil, nil, false
	}
	iter, err := strconv.Atoi(parts[1])
	if err != nil || iter < 1 || iter > maxStoredPBKDF2Iter {
		return 0, nil, nil, false
	}
	salt, err1 := b64.DecodeString(parts[2])
	want, err2 := b64.DecodeString(parts[3])
	if err1 != nil || err2 != nil || len(salt) < 16 || len(salt) > 64 || len(want) != 32 {
		return 0, nil, nil, false
	}
	return iter, salt, want, true
}

func verifyPassword(pw, stored string) bool {
	iter, salt, want, ok := parsePasswordHash(stored)
	if !ok {
		return false
	}
	got, err := pbkdf2.Key(sha256.New, pw, salt, iter, len(want))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(got, want) == 1
}

func passwordHashNeedsRehash(stored string) bool {
	iter, _, _, _ := parsePasswordHash(stored)
	return iter < pbkdf2Iter
}

// ---------- imzalı token (HMAC-SHA256, harici kütüphane yok) ----------

func (s *AuthService) sign(payload string) string {
	m := hmac.New(sha256.New, s.secret)
	m.Write([]byte(payload))
	return b64.EncodeToString(m.Sum(nil))
}

func (s *AuthService) issueToken(userID string, tokenVersion int) string {
	payload := userID + "|" + strconv.Itoa(tokenVersion) + "|" + strconv.FormatInt(time.Now().Add(tokenTTL).Unix(), 10)
	return b64.EncodeToString([]byte(payload)) + "." + s.sign(payload)
}

func (s *AuthService) parseToken(tok string) (string, int, bool) {
	parts := strings.Split(tok, ".")
	if len(parts) != 2 {
		return "", 0, false
	}
	raw, err := b64.DecodeString(parts[0])
	if err != nil {
		return "", 0, false
	}
	payload := string(raw)
	if !hmac.Equal([]byte(parts[1]), []byte(s.sign(payload))) {
		return "", 0, false
	}
	claims := strings.Split(payload, "|")
	if len(claims) != 2 && len(claims) != 3 {
		return "", 0, false
	}
	userID, tokenVersion, expiry := claims[0], 0, claims[1]
	if len(claims) == 3 {
		version, err := strconv.Atoi(claims[1])
		if err != nil || version < 0 {
			return "", 0, false
		}
		tokenVersion, expiry = version, claims[2]
	}
	exp, err := strconv.ParseInt(expiry, 10, 64)
	if err != nil || time.Now().Unix() > exp || !domain.IsUUID(userID) {
		return "", 0, false
	}
	return userID, tokenVersion, true
}

// UserID: isteği yapan kullanıcıyı döndürür (Bearer token; izin verilmişse X-User-ID).
func (s *AuthService) UserID(ctx context.Context, r *http.Request) (string, bool, error) {
	if h := r.Header.Get("Authorization"); h != "" {
		if !strings.HasPrefix(h, "Bearer ") {
			return "", false, nil
		}
		userID, tokenVersion, ok := s.parseToken(strings.TrimPrefix(h, "Bearer "))
		if !ok {
			return "", false, nil
		}
		user, err := s.repo.GetAuthUser(ctx, userID)
		if errors.Is(err, domain.ErrUserNotFound) {
			return "", false, nil
		}
		if err != nil {
			return "", false, err
		}
		if user.TokenVersion != tokenVersion {
			return "", false, nil
		}
		return userID, true, nil
	}
	return "", false, nil
}

// ---------- kayıt / giriş ----------

func (s *AuthService) Register(ctx context.Context, in domain.RegisterInput) (*domain.AuthResult, error) {
	in.FullName = strings.TrimSpace(in.FullName)
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Role = strings.TrimSpace(in.Role)
	if in.Role == "" {
		in.Role = domain.RoleCustomer
	}

	switch {
	case in.FullName == "" || len(in.FullName) > 100:
		return nil, invalid("ad soyad zorunlu (en fazla 100 karakter)")
	case !emailPattern.MatchString(in.Email) || len(in.Email) > 254:
		return nil, invalid("geçerli bir e-posta girin")
	case len(in.Password) < minPasswordLen || len(in.Password) > maxPasswordLen:
		return nil, invalid("şifre en az %d karakter olmalı", minPasswordLen)
	case in.Role != domain.RoleCustomer && in.Role != domain.RoleBusinessOwner:
		return nil, invalid("rol customer veya business_owner olmalı")
	}

	if in.Role == domain.RoleBusinessOwner {
		b := in.Business
		if b == nil {
			return nil, invalid("işletme bilgileri zorunlu")
		}
		b.Name, b.Address, b.District = strings.TrimSpace(b.Name), strings.TrimSpace(b.Address), strings.TrimSpace(b.District)
		switch {
		case b.Name == "" || len(b.Name) > 120:
			return nil, invalid("işletme adı zorunlu ve en fazla 120 karakter olmalı")
		case !b.Category.Valid():
			return nil, invalid("kategori firin, kafe, tatli veya yemek olmalı")
		case b.Address == "" || len(b.Address) > 300:
			return nil, invalid("işletme adresi zorunlu ve en fazla 300 karakter olmalı")
		case len(b.District) > 100:
			return nil, invalid("ilçe en fazla 100 karakter olabilir")
		case math.IsNaN(b.Lat) || math.IsInf(b.Lat, 0) || math.IsNaN(b.Lon) || math.IsInf(b.Lon, 0) ||
			b.Lat < -90 || b.Lat > 90 || b.Lon < -180 || b.Lon > 180 || (b.Lat == 0 && b.Lon == 0):
			return nil, invalid("geçerli işletme konumu (lat, lon) zorunlu")
		}
	} else {
		in.Business = nil
	}

	hash, err := hashPassword(in.Password)
	if err != nil {
		return nil, err
	}
	u, err := s.repo.CreateAccount(ctx, in, hash)
	if err != nil {
		return nil, err
	}
	return &domain.AuthResult{Token: s.issueToken(u.ID, u.TokenVersion), User: *u}, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*domain.AuthResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	u, hash, err := s.repo.GetCredentials(ctx, email)
	if errors.Is(err, domain.ErrUserNotFound) {
		verifyPassword(password, dummyHash)
		return nil, domain.ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}
	if hash == "" {
		verifyPassword(password, dummyHash)
		return nil, domain.ErrInvalidCredentials
	}
	if !verifyPassword(password, hash) {
		return nil, domain.ErrInvalidCredentials
	}
	if passwordHashNeedsRehash(hash) {
		updatedHash, err := hashPassword(password)
		if err != nil {
			return nil, err
		}
		if err := s.repo.UpdatePasswordHash(ctx, u.ID, updatedHash); err != nil {
			return nil, err
		}
	}
	return &domain.AuthResult{Token: s.issueToken(u.ID, u.TokenVersion), User: *u}, nil
}

func (s *AuthService) GetAuthUser(ctx context.Context, id string) (*domain.AuthUser, error) {
	return s.repo.GetAuthUser(ctx, id)
}

func (s *AuthService) MyBusiness(ctx context.Context, ownerID string) (*domain.Business, error) {
	return s.repo.GetBusinessByOwner(ctx, ownerID)
}

func (s *AuthService) RevokeTokens(ctx context.Context, userID string) error {
	return s.repo.RevokeTokens(ctx, userID)
}

// EnsureSeedPasswords: seed kullanıcılarına (şifresi boşsa) geliştirme şifresi atar.
func (s *AuthService) EnsureSeedPasswords(ctx context.Context, password string) error {
	hash, err := hashPassword(password)
	if err != nil {
		return err
	}
	for _, email := range []string{"musteri@nightbag.com", "elif@modafirini.com"} {
		if err := s.repo.SetPasswordIfEmpty(ctx, email, hash); err != nil {
			return err
		}
	}
	return nil
}
