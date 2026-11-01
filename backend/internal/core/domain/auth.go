package domain

import "context"

const (
	RoleCustomer      = "customer"
	RoleBusinessOwner = "business_owner"
)

type BusinessInput struct {
	Name     string      `json:"name"`
	Category BagCategory `json:"category"`
	Address  string      `json:"address"`
	District string      `json:"district"`
	Lat      float64     `json:"lat"`
	Lon      float64     `json:"lon"`
}

type RegisterInput struct {
	FullName string
	Email    string
	Password string
	Role     string
	Business *BusinessInput
}

type AuthUser struct {
	User
	BusinessID *string `json:"business_id,omitempty"`
}

type AuthResult struct {
	Token string   `json:"token"`
	User  AuthUser `json:"user"`
}

type Business struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Description string  `json:"description"`
	Address     string  `json:"address"`
	District    string  `json:"district"`
	City        string  `json:"city"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Rating      float64 `json:"rating"`
	ReviewCount int     `json:"review_count"`
}

type AuthRepository interface {
	CreateAccount(ctx context.Context, in RegisterInput, passwordHash string) (*AuthUser, error)
	GetCredentials(ctx context.Context, email string) (*AuthUser, string, error)
	GetBusinessByOwner(ctx context.Context, ownerID string) (*Business, error)
	GetAuthUser(ctx context.Context, id string) (*AuthUser, error)
	SetPasswordIfEmpty(ctx context.Context, email, passwordHash string) error
}
