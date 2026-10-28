package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"regexp"
	"strconv"

	"nightbag/internal/core/domain"
	"nightbag/internal/core/services"
)

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

type BagHandler struct {
	svc *services.BagService
}

func NewBagHandler(svc *services.BagService) *BagHandler {
	return &BagHandler{svc: svc}
}

func (h *BagHandler) Register(mux *http.ServeMux) {
	// Herkese açık
	mux.HandleFunc("GET /api/v1/listings/nearby", h.nearby)
	mux.HandleFunc("GET /api/v1/listings/{id}", h.getListing)

	// Müşteri
	mux.HandleFunc("GET /api/v1/users/me/stats", h.auth(h.getUserStats))
	mux.HandleFunc("POST /api/v1/listings/{id}/reserve", h.auth(h.reserve))
	mux.HandleFunc("GET /api/v1/reservations", h.auth(h.listReservations))
	mux.HandleFunc("POST /api/v1/reservations/{id}/cancel", h.auth(h.cancelReservation))

	mux.HandleFunc("POST /api/v1/favorites/{businessID}", h.auth(h.addFavorite))
	mux.HandleFunc("DELETE /api/v1/favorites/{businessID}", h.auth(h.removeFavorite))

	mux.HandleFunc("GET /api/v1/users/me", h.auth(h.getMe))
	mux.HandleFunc("GET /api/v1/favorites", h.auth(h.listFavorites))

	mux.HandleFunc("POST /api/v1/business/{businessID}/listings", h.auth(h.createListing))
	mux.HandleFunc("GET /api/v1/business/overview", h.auth(h.overview))
	mux.HandleFunc("GET /api/v1/business/reservations", h.auth(h.businessReservations))
	mux.HandleFunc("POST /api/v1/business/pickups", h.auth(h.completePickup))
}

// ---------- yardımcılar ----------

// auth: GEÇİCİ kimlik doğrulama. İstemci X-User-ID başlığında kullanıcı UUID'sini gönderir.
// Gerçek uygulamada JWT / oturum doğrulamasıyla değiştirin.
func (h *BagHandler) auth(next func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid := r.Header.Get("X-User-ID")
		if !uuidRe.MatchString(uid) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "geçerli X-User-ID başlığı gerekli"})
			return
		}
		next(w, r, uid)
	}
}
func (h *BagHandler) businessReservations(w http.ResponseWriter, r *http.Request, ownerID string) {
	items, err := h.svc.BusinessReservations(r.Context(), ownerID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("json encode: %v", err)
	}
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	msg := "sunucu hatası"

	switch {
	case errors.Is(err, domain.ErrInvalidInput):
		status, msg = http.StatusBadRequest, err.Error()
	case errors.Is(err, domain.ErrNotFound), errors.Is(err, domain.ErrReservationNotFound):
		status, msg = http.StatusNotFound, err.Error()
	case errors.Is(err, domain.ErrUserNotFound):
		status, msg = http.StatusUnauthorized, err.Error()
	case errors.Is(err, domain.ErrForbidden):
		status, msg = http.StatusForbidden, err.Error()
	case errors.Is(err, domain.ErrListingNotAvailable),
		errors.Is(err, domain.ErrInsufficientStock),
		errors.Is(err, domain.ErrPickupWindowPassed),
		errors.Is(err, domain.ErrNotCancellable):
		status, msg = http.StatusConflict, err.Error()
	default:
		log.Printf("internal error: %v", err)
	}
	writeJSON(w, status, map[string]string{"error": msg})
}

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON gövdesi"})
		return false
	}
	return true
}

func pathUUID(w http.ResponseWriter, r *http.Request, name string) (string, bool) {
	v := r.PathValue(name)
	if !uuidRe.MatchString(v) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": name + " geçerli bir UUID olmalı"})
		return "", false
	}
	return v, true
}

// ---------- herkese açık ----------

// GET /api/v1/listings/nearby?lat=40.98&lon=29.02&radius=5000&category=firin&q=moda&limit=50
func (h *BagHandler) nearby(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	lat, err1 := strconv.ParseFloat(q.Get("lat"), 64)
	lon, err2 := strconv.ParseFloat(q.Get("lon"), 64)
	if err1 != nil || err2 != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "lat ve lon zorunlu"})
		return
	}
	radius, _ := strconv.ParseFloat(q.Get("radius"), 64) // metre, boşsa 5000
	limit, _ := strconv.Atoi(q.Get("limit"))

	items, err := h.svc.NearbyListings(r.Context(), domain.NearbyFilter{
		Lat: lat, Lon: lon, RadiusM: radius,
		Category: domain.BagCategory(q.Get("category")),
		Query:    q.Get("q"),
		Limit:    limit,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *BagHandler) getListing(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	l, err := h.svc.GetListing(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, l)
}

// ---------- müşteri ----------

// POST /api/v1/listings/{id}/reserve   gövde: {"quantity": 1}
func (h *BagHandler) reserve(w http.ResponseWriter, r *http.Request, userID string) {
	listingID, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var req struct {
		Quantity int `json:"quantity"`
	}
	if r.ContentLength != 0 && !decode(w, r, &req) {
		return
	}
	if req.Quantity == 0 {
		req.Quantity = 1
	}

	res, err := h.svc.Reserve(r.Context(), userID, listingID, req.Quantity)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, res)
}

// GET /api/v1/reservations?status=all|active|past
func (h *BagHandler) listReservations(w http.ResponseWriter, r *http.Request, userID string) {
	items, err := h.svc.ListReservations(r.Context(), userID, domain.ReservationScope(r.URL.Query().Get("status")))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *BagHandler) cancelReservation(w http.ResponseWriter, r *http.Request, userID string) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	if err := h.svc.CancelReservation(r.Context(), userID, id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- işletme ----------

type createListingRequest struct {
	Title         string   `json:"title"`
	Category      string   `json:"category"`
	Description   string   `json:"description"`
	ContentTags   []string `json:"content_tags"`
	AllergenNote  *string  `json:"allergen_note"`
	OriginalValue float64  `json:"original_value"`
	Price         float64  `json:"price"`
	Quantity      int      `json:"quantity"`
	PickupDate    string   `json:"pickup_date"`
	PickupStart   string   `json:"pickup_start"`
	PickupEnd     string   `json:"pickup_end"`
	PhotoURL      *string  `json:"photo_url"`
}

// POST /api/v1/business/{businessID}/listings
func (h *BagHandler) createListing(w http.ResponseWriter, r *http.Request, ownerID string) {
	businessID, ok := pathUUID(w, r, "businessID")
	if !ok {
		return
	}
	var req createListingRequest
	if !decode(w, r, &req) {
		return
	}

	l, err := h.svc.CreateListing(r.Context(), domain.CreateListingInput{
		BusinessID:    businessID,
		OwnerID:       ownerID,
		Title:         req.Title,
		Category:      domain.BagCategory(req.Category),
		Description:   req.Description,
		ContentTags:   req.ContentTags,
		AllergenNote:  req.AllergenNote,
		OriginalValue: req.OriginalValue,
		Price:         req.Price,
		Quantity:      req.Quantity,
		PickupDate:    req.PickupDate,
		PickupStart:   req.PickupStart,
		PickupEnd:     req.PickupEnd,
		PhotoURL:      req.PhotoURL,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, l)
}

func (h *BagHandler) overview(w http.ResponseWriter, r *http.Request, ownerID string) {
	o, err := h.svc.BusinessOverview(r.Context(), ownerID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

// POST /api/v1/business/pickups   gövde: {"code": "NB-482615"}
func (h *BagHandler) completePickup(w http.ResponseWriter, r *http.Request, ownerID string) {
	var req struct {
		Code string `json:"code"`
	}
	if !decode(w, r, &req) {
		return
	}
	res, err := h.svc.CompletePickup(r.Context(), ownerID, req.Code)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *BagHandler) getUserStats(w http.ResponseWriter, r *http.Request, userID string) {
	stats, err := h.svc.GetUserStats(r.Context(), userID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *BagHandler) addFavorite(w http.ResponseWriter, r *http.Request, userID string) {
	businessID, ok := pathUUID(w, r, "businessID")
	if !ok {
		return
	}
	if err := h.svc.AddFavorite(r.Context(), userID, businessID); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
}

func (h *BagHandler) removeFavorite(w http.ResponseWriter, r *http.Request, userID string) {
	businessID, ok := pathUUID(w, r, "businessID")
	if !ok {
		return
	}
	if err := h.svc.RemoveFavorite(r.Context(), userID, businessID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *BagHandler) getMe(w http.ResponseWriter, r *http.Request, userID string) {
	u, err := h.svc.GetUser(r.Context(), userID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (h *BagHandler) listFavorites(w http.ResponseWriter, r *http.Request, userID string) {
	items, err := h.svc.ListFavoriteListings(r.Context(), userID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}
