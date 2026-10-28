package domain

import "errors"

var (
	ErrInvalidInput        = errors.New("geçersiz istek")
	ErrNotFound            = errors.New("çanta ilanı bulunamadı")
	ErrReservationNotFound = errors.New("rezervasyon bulunamadı")
	ErrUserNotFound        = errors.New("kullanıcı bulunamadı")
	ErrForbidden           = errors.New("bu işletme için yetkiniz yok")
	ErrListingNotAvailable = errors.New("bu çanta şu an rezerve edilemez")
	ErrInsufficientStock   = errors.New("yeterli çanta kalmadı")
	ErrPickupWindowPassed  = errors.New("teslim alma saati geçti")
	ErrNotCancellable      = errors.New("bu rezervasyon iptal edilemez")
)
