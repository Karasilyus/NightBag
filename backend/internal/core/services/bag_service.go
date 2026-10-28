package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"nightbag/internal/core/domain"
)

const (
	maxPerReservation = 4
	maxListingQty     = 500
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
	if f.Lat < -90 || f.Lat > 90 || f.Lon < -180 || f.Lon > 180 {
		return nil, invalid("geçersiz koordinat")
	}
	if f.RadiusM <= 0 {
		f.RadiusM = 5000
	}
	if f.RadiusM > 50000 {
		f.RadiusM = 50000
	}
	if f.Category != "" && !f.Category.Valid() {
		return nil, invalid("kategori firin, kafe veya yemek olmalı")
	}
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}
	f.Query = strings.TrimSpace(f.Query)
	return s.repo.NearbyListings(ctx, f)
}

func (s *BagService) GetListing(ctx context.Context, id string) (*domain.Listing, error) {
	return s.repo.GetListing(ctx, id)
}

func (s *BagService) CreateListing(ctx context.Context, in domain.CreateListingInput) (*domain.Listing, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)

	switch {
	case in.Title == "":
		return nil, invalid("başlık zorunlu")
	case !in.Category.Valid():
		return nil, invalid("kategori firin, kafe veya yemek olmalı")
	case in.OriginalValue <= 0:
		return nil, invalid("tahmini değer 0'dan büyük olmalı")
	case in.Price <= 0 || in.Price > in.OriginalValue:
		return nil, invalid("fiyat 0'dan büyük ve tahmini değeri aşmayan bir değer olmalı")
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
	return s.repo.CreateListing(ctx, in)
}

func (s *BagService) Reserve(ctx context.Context, userID, listingID string, qty int) (*domain.Reservation, error) {
	if qty < 1 || qty > maxPerReservation {
		return nil, invalid("adet 1 ile %d arasında olmalı", maxPerReservation)
	}
	return s.repo.Reserve(ctx, userID, listingID, qty)
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
