package services

import (
	"context"
	"errors"
	"math"
	"strings"
	"testing"

	"nightbag/internal/core/domain"
)

func TestNearbyRejectsNonFiniteValues(t *testing.T) {
	svc := NewBagService(nil)
	tests := []domain.NearbyFilter{
		{Lat: math.NaN(), Lon: 29},
		{Lat: 40, Lon: math.Inf(1)},
		{Lat: 40, Lon: 29, RadiusM: math.NaN()},
	}
	for _, filter := range tests {
		if _, err := svc.NearbyListings(context.Background(), filter); !errors.Is(err, domain.ErrInvalidInput) {
			t.Fatalf("beklenen geçersiz girdi hatası, alınan: %v", err)
		}
	}
}

func TestNearbyRejectsLongSearchQuery(t *testing.T) {
	svc := NewBagService(nil)
	_, err := svc.NearbyListings(context.Background(), domain.NearbyFilter{
		Lat: 40, Lon: 29, Query: strings.Repeat("x", 101),
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("beklenen geçersiz girdi hatası, alınan: %v", err)
	}
}

func TestCreateListingRejectsNumericOverflow(t *testing.T) {
	svc := NewBagService(nil)
	_, err := svc.CreateListing(context.Background(), domain.CreateListingInput{
		Title:         "Geçerli başlık",
		Category:      domain.CategoryFirin,
		OriginalValue: maxPrice + 1,
		Price:         1,
		Quantity:      1,
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("beklenen geçersiz girdi hatası, alınan: %v", err)
	}
}

func TestReserveRequiresTermsAcceptance(t *testing.T) {
	svc := NewBagService(nil)
	_, err := svc.Reserve(context.Background(), "user-id", "listing-id", domain.ReservationInput{
		Quantity: 1,
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("beklenen geçersiz girdi hatası, alınan: %v", err)
	}
}
