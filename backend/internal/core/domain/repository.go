package domain

import "context"

type BagRepository interface {
	NearbyListings(ctx context.Context, f NearbyFilter) ([]Listing, error)
	GetListing(ctx context.Context, id string) (*Listing, error)
	CreateListing(ctx context.Context, in CreateListingInput) (*Listing, error)
	Reserve(ctx context.Context, userID, listingID string, qty int) (*Reservation, error)
	ListReservations(ctx context.Context, userID string, scope ReservationScope) ([]Reservation, error)
	CancelReservation(ctx context.Context, userID, reservationID string) error
	CompletePickup(ctx context.Context, ownerID, code string) (*Reservation, error)
	BusinessOverview(ctx context.Context, ownerID string) (*BusinessOverview, error)
	BusinessReservations(ctx context.Context, ownerID string) ([]Reservation, error)
	GetUserStats(ctx context.Context, userID string) (*UserStats, error)
	AddFavorite(ctx context.Context, userID, businessID string) error
	RemoveFavorite(ctx context.Context, userID, businessID string) error
	GetUser(ctx context.Context, id string) (*User, error)
	ListFavoriteListings(ctx context.Context, userID string) ([]Listing, error)
}
