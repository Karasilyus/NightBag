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

func TestUpdateUserPreferencesValidatesRadiusAndCategories(t *testing.T) {
	svc := NewBagService(nil)
	tests := []domain.UserPreferences{
		{SearchRadiusM: 499, NotificationsEnabled: true},
		{SearchRadiusM: 50001, NotificationsEnabled: true},
		{SearchRadiusM: 5000, FavoriteCategories: []string{"unknown"}},
		{SearchRadiusM: 5000, FavoriteCategories: []string{"firin", "firin"}},
	}
	for _, preferences := range tests {
		if _, err := svc.UpdateUserPreferences(context.Background(), "user-id", preferences); !errors.Is(err, domain.ErrInvalidInput) {
			t.Fatalf("beklenen geçersiz tercih hatası, alınan: %v", err)
		}
	}
}

func TestUpdateUserPreferencesValidatesLocation(t *testing.T) {
	svc := NewBagService(nil)
	_, err := svc.UpdateUserPreferences(context.Background(), "user-id", domain.UserPreferences{
		SearchRadiusM: 5000,
		Location:      &domain.UserLocation{Latitude: math.NaN(), Longitude: 29, Label: "Konum"},
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("beklenen geçersiz konum hatası, alınan: %v", err)
	}
}

func TestRegisterPushTokenValidatesTokenAndPlatform(t *testing.T) {
	svc := NewBagService(nil)
	tests := []struct {
		name, token, platform string
	}{
		{name: "missing token", platform: "ios"},
		{name: "invalid token format", token: "not-a-push-token", platform: "ios"},
		{name: "invalid platform", token: "ExpoPushToken[abc123]", platform: "web"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := svc.RegisterPushToken(context.Background(), "user-id", test.token, test.platform)
			if !errors.Is(err, domain.ErrInvalidInput) {
				t.Fatalf("beklenen geçersiz girdi hatası, alınan: %v", err)
			}
		})
	}
}
