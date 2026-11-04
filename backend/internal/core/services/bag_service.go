package services

import (
	"context"
	"fmt"
	"math"
	"net/url"
	"regexp"
	"strings"
	"time"

	"nightbag/internal/core/domain"
)

const (
	maxPerReservation = 4
	maxListingQty     = 500
	maxPrice          = 99_999_999.99
)

var (
	pickupCodeRe = regexp.MustCompile(`^NB-\d{6}$`)
	turkeyTZ     = time.FixedZone("TRT", 3*60*60) // Türkiye kalıcı UTC+3
)

type BagService struct {
	repo domain.BagRepository
}

func NewBagService(repo domain.BagRepository) *BagService {
	return &BagService{repo: repo}
}

func invalid(format string, a ...any) error {
	return fmt.Errorf("%w: %s", domain.ErrInvalidInput, fmt.Sprintf(format, a...))
}

func (s *BagService) NearbyListings(ctx context.Context, f domain.NearbyFilter) ([]domain.Listing, error) {
	if math.IsNaN(f.Lat) || math.IsInf(f.Lat, 0) || math.IsNaN(f.Lon) || math.IsInf(f.Lon, 0) ||
		f.Lat < -90 || f.Lat > 90 || f.Lon < -180 || f.Lon > 180 {
		return nil, invalid("geçersiz koordinat")
	}
	if math.IsNaN(f.RadiusM) || math.IsInf(f.RadiusM, 0) {
		return nil, invalid("geçersiz arama yarıçapı")
	}
	if f.RadiusM <= 0 {
		f.RadiusM = 5000
	}
	if f.RadiusM > 50000 {
		f.RadiusM = 50000
	}
	if f.Category != "" && !f.Category.Valid() {
		return nil, invalid("kategori firin, kafe, tatli veya yemek olmalı")
	}
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}
	f.Query = strings.TrimSpace(f.Query)
	if len(f.Query) > 100 {
		return nil, invalid("arama metni en fazla 100 karakter olabilir")
	}
	return s.repo.NearbyListings(ctx, f)
}

func (s *BagService) GetListing(ctx context.Context, id string) (*domain.Listing, error) {
	return s.repo.GetListing(ctx, id)
}

func (s *BagService) CreateListing(ctx context.Context, in domain.CreateListingInput) (*domain.Listing, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	if in.AllergenNote != nil {
		note := strings.TrimSpace(*in.AllergenNote)
		in.AllergenNote = &note
	}
	if in.PhotoURL != nil {
		photoURL := strings.TrimSpace(*in.PhotoURL)
		if photoURL == "" {
			in.PhotoURL = nil
		} else {
			parsed, err := url.ParseRequestURI(photoURL)
			if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || len(photoURL) > 2048 {
				return nil, invalid("fotoğraf bağlantısı geçerli ve HTTPS olmalı")
			}
			in.PhotoURL = &photoURL
		}
	}

	switch {
	case in.Title == "" || len(in.Title) > 120:
		return nil, invalid("başlık zorunlu ve en fazla 120 karakter olmalı")
	case len(in.Description) > 2000:
		return nil, invalid("açıklama en fazla 2000 karakter olabilir")
	case in.AllergenNote != nil && len(*in.AllergenNote) > 500:
		return nil, invalid("alerjen notu en fazla 500 karakter olabilir")
	case !in.Category.Valid():
		return nil, invalid("kategori firin, kafe, tatli veya yemek olmalı")
	case math.IsNaN(in.OriginalValue) || math.IsInf(in.OriginalValue, 0) ||
		in.OriginalValue <= 0 || in.OriginalValue > maxPrice:
		return nil, invalid("tahmini değer 0'dan büyük ve en fazla 99.999.999,99 olmalı")
	case math.IsNaN(in.Price) || math.IsInf(in.Price, 0) ||
		in.Price <= 0 || in.Price > in.OriginalValue || in.Price > maxPrice:
		return nil, invalid("fiyat 0'dan büyük, tahmini değeri aşmayan ve en fazla 99.999.999,99 olmalı")
	case in.Quantity < 1 || in.Quantity > maxListingQty:
		return nil, invalid("çanta adedi 1 ile %d arasında olmalı", maxListingQty)
	}

	date, err := time.Parse("2006-01-02", in.PickupDate)
	if err != nil {
		return nil, invalid("pickup_date YYYY-AA-GG biçiminde olmalı")
	}
	start, err := time.Parse("15:04", in.PickupStart)
	if err != nil {
		return nil, invalid("pickup_start SS:DD biçiminde olmalı")
	}
	end, err := time.Parse("15:04", in.PickupEnd)
	if err != nil {
		return nil, invalid("pickup_end SS:DD biçiminde olmalı")
	}
	if !end.After(start) {
		return nil, invalid("bitiş saati başlangıçtan sonra olmalı")
	}
	if in.PickupDate < time.Now().In(turkeyTZ).Format("2006-01-02") {
		return nil, invalid("geçmiş bir tarih için ilan yayınlanamaz")
	}
	if date.After(time.Now().In(turkeyTZ).AddDate(1, 0, 0)) {
		return nil, invalid("teslim tarihi en fazla bir yıl ileri olabilir")
	}

	in.PickupDate = date.Format("2006-01-02")
	in.PickupStart = start.Format("15:04")
	in.PickupEnd = end.Format("15:04")
	now := time.Now().In(turkeyTZ)
	if in.PickupDate == now.Format("2006-01-02") && in.PickupEnd <= now.Format("15:04") {
		return nil, invalid("teslim saati bugün için geçmiş")
	}
	if in.ContentTags == nil {
		in.ContentTags = []string{}
	}
	if len(in.ContentTags) > 20 {
		return nil, invalid("en fazla 20 içerik etiketi eklenebilir")
	}
	for i, tag := range in.ContentTags {
		in.ContentTags[i] = strings.TrimSpace(tag)
		if in.ContentTags[i] == "" || len(in.ContentTags[i]) > 40 {
			return nil, invalid("içerik etiketleri boş olamaz ve en fazla 40 karakter olabilir")
		}
	}
	return s.repo.CreateListing(ctx, in)
}

func (s *BagService) Reserve(ctx context.Context, userID, listingID string, input domain.ReservationInput) (*domain.Reservation, error) {
	if input.Quantity < 1 || input.Quantity > maxPerReservation {
		return nil, invalid("adet 1 ile %d arasında olmalı", maxPerReservation)
	}
	if !input.AcceptedTerms {
		return nil, invalid("rezervasyon şartlarını onaylamanız gerekiyor")
	}
	return s.repo.Reserve(ctx, userID, listingID, input)
}

func (s *BagService) ListReservations(ctx context.Context, userID string, scope domain.ReservationScope) ([]domain.Reservation, error) {
	switch scope {
	case "", domain.ScopeAll:
		scope = domain.ScopeAll
	case domain.ScopeActive, domain.ScopePast:
	default:
		return nil, invalid("status all, active veya past olmalı")
	}
	return s.repo.ListReservations(ctx, userID, scope)
}

func (s *BagService) CancelReservation(ctx context.Context, userID, reservationID string) error {
	return s.repo.CancelReservation(ctx, userID, reservationID)
}

func (s *BagService) CompletePickup(ctx context.Context, ownerID, code string) (*domain.Reservation, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if !pickupCodeRe.MatchString(code) {
		return nil, invalid("kod NB-123456 biçiminde olmalı")
	}
	return s.repo.CompletePickup(ctx, ownerID, code)
}

func (s *BagService) BusinessOverview(ctx context.Context, ownerID string) (*domain.BusinessOverview, error) {
	return s.repo.BusinessOverview(ctx, ownerID)
}

func (s *BagService) BusinessReservations(ctx context.Context, ownerID string) ([]domain.Reservation, error) {
	return s.repo.BusinessReservations(ctx, ownerID)
}

func (s *BagService) GetUserStats(ctx context.Context, userID string) (*domain.UserStats, error) {
	return s.repo.GetUserStats(ctx, userID)
}

func (s *BagService) AddFavorite(ctx context.Context, userID, businessID string) error {
	return s.repo.AddFavorite(ctx, userID, businessID)
}

func (s *BagService) RemoveFavorite(ctx context.Context, userID, businessID string) error {
	return s.repo.RemoveFavorite(ctx, userID, businessID)
}

func (s *BagService) ListFavoriteListings(ctx context.Context, userID string) ([]domain.Listing, error) {
	return s.repo.ListFavoriteListings(ctx, userID)
}
