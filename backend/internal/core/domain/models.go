package domain

import "time"

type BagCategory string

const (
	CategoryFirin BagCategory = "firin"
	CategoryKafe  BagCategory = "kafe"
	CategoryYemek BagCategory = "yemek"
)

func (c BagCategory) Valid() bool {
	switch c {
	case CategoryFirin, CategoryKafe, CategoryYemek:
		return true
	}
	return false
}

// Listing: sürpriz çanta ilanı + işletme bilgisi (liste, harita ve detay ekranları).
type Listing struct {
	ID                string      `json:"id"`
	BusinessID        string      `json:"business_id"`
	BusinessName      string      `json:"business_name"`
	Title             string      `json:"title"`
	Category          BagCategory `json:"category"`
	Description       string      `json:"description"`
	ContentTags       []string    `json:"content_tags"`
	AllergenNote      *string     `json:"allergen_note,omitempty"`
	OriginalValue     float64     `json:"original_value"`
	Price             float64     `json:"price"`
	QuantityTotal     int         `json:"quantity_total"`
	QuantityRemaining int         `json:"quantity_remaining"`
	PickupDate        string      `json:"pickup_date"`  // YYYY-MM-DD
	PickupStart       string      `json:"pickup_start"` // HH:MM
	PickupEnd         string      `json:"pickup_end"`   // HH:MM
	PhotoURL          *string     `json:"photo_url,omitempty"`
	Status            string      `json:"status"`
	Lon               float64     `json:"lon"`
	Lat               float64     `json:"lat"`
	DistanceM         *float64    `json:"distance_m,omitempty"`
	Rating            float64     `json:"rating"`
	ReviewCount       int         `json:"review_count"`
}

type NearbyFilter struct {
	Lon      float64
	Lat      float64
	RadiusM  float64
	Category BagCategory
	Query    string
	Limit    int
}

type CreateListingInput struct {
	BusinessID    string
	OwnerID       string
	Title         string
	Category      BagCategory
	Description   string
	ContentTags   []string
	AllergenNote  *string
	OriginalValue float64
	Price         float64
	Quantity      int
	PickupDate    string
	PickupStart   string
	PickupEnd     string
	PhotoURL      *string
}

type ReservationScope string

const (
	ScopeAll    ReservationScope = "all"
	ScopeActive ReservationScope = "active"
	ScopePast   ReservationScope = "past"
)

type Reservation struct {
	ID              string     `json:"id"`
	ListingID       string     `json:"listing_id"`
	BusinessName    string     `json:"business_name"`
	BusinessAddress string     `json:"business_address"`
	Title           string     `json:"title"`
	PickupDate      string     `json:"pickup_date"`
	PickupStart     string     `json:"pickup_start"`
	PickupEnd       string     `json:"pickup_end"`
	Quantity        int        `json:"quantity"`
	UnitPrice       float64    `json:"unit_price"`
	TotalPrice      float64    `json:"total_price"`
	PickupCode      string     `json:"pickup_code"`
	Status          string     `json:"status"`
	Lon             float64    `json:"lon"`
	Lat             float64    `json:"lat"`
	CreatedAt       time.Time  `json:"created_at"`
	PickedUpAt      *time.Time `json:"picked_up_at,omitempty"`
}

type TodaysBag struct {
	Title    string  `json:"title"`
	ImageUrl *string `json:"imageUrl"`
}

type BusinessOverview struct {
	Published int        `json:"published"`
	Reserved  int        `json:"reserved"`
	Remaining int        `json:"remaining"`
	TodaysBag *TodaysBag `json:"todaysBag"`
}

type UserStats struct {
	BagsSaved  int     `json:"bags_saved"`
	MoneySaved float64 `json:"money_saved"`
}

type User struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}
