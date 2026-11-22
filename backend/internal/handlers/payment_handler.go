package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"strings"

	"nightbag/internal/core/domain"
	"nightbag/internal/core/services"
)

type PaymentHandler struct {
	service *services.PaymentService
	authSvc *services.AuthService
}

func NewPaymentHandler(service *services.PaymentService, authSvc *services.AuthService) *PaymentHandler {
	return &PaymentHandler{service: service, authSvc: authSvc}
}

func (h *PaymentHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/payments/checkout", h.auth(h.startCheckout))
	mux.HandleFunc("GET /api/v1/payments/{orderID}", h.auth(h.status))
	mux.HandleFunc("POST /api/v1/payments/iyzico/callback", h.callback)
	mux.HandleFunc("GET /api/v1/payments/iyzico/callback", h.callback)
	mux.HandleFunc("GET /api/v1/payments/iyzico/form/{token}", h.checkoutForm)
}

func (h *PaymentHandler) auth(next func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok, err := h.authSvc.UserID(r.Context(), r)
		if err != nil {
			writeError(w, err)
			return
		}
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "giriş yapmanız gerekiyor"})
			return
		}
		next(w, r, userID)
	}
}

func (h *PaymentHandler) startCheckout(w http.ResponseWriter, r *http.Request, userID string) {
	var req struct {
		ListingID     string `json:"listing_id"`
		Quantity      int    `json:"quantity"`
		AcceptedTerms bool   `json:"accepted_terms"`
	}
	if !decode(w, r, &req) {
		return
	}
	if req.Quantity == 0 {
		req.Quantity = 1
	}
	if !domain.IsUUID(req.ListingID) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "listing_id geçerli bir UUID olmalı"})
		return
	}
	result, err := h.service.StartCheckout(r.Context(), userID, req.ListingID, req.Quantity, req.AcceptedTerms, clientIP(r))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

func (h *PaymentHandler) status(w http.ResponseWriter, r *http.Request, userID string) {
	orderID, ok := pathUUID(w, r, "orderID")
	if !ok {
		return
	}
	result, err := h.service.Status(r.Context(), userID, orderID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *PaymentHandler) checkoutForm(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	form, err := h.service.CheckoutForm(r.Context(), token)
	if err != nil {
		writeError(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>`))
	_, _ = w.Write([]byte(form))
	_, _ = w.Write([]byte(`</body></html>`))
}

func parseIyzicoCallbackToken(w http.ResponseWriter, r *http.Request) (string, error) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token != "" {
		return token, nil
	}
	if r.Method != http.MethodPost {
		return "", errors.New("token zorunludur")
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	contentType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil && r.Header.Get("Content-Type") != "" {
		return "", errors.New("geçersiz callback içerik türü")
	}

	switch contentType {
	case "application/json":
		var body struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return "", errors.New("geçersiz JSON callback gövdesi")
		}
		token = strings.TrimSpace(body.Token)
	case "multipart/form-data":
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			return "", errors.New("geçersiz form callback gövdesi")
		}
		token = strings.TrimSpace(r.FormValue("token"))
	case "application/x-www-form-urlencoded", "":
		if err := r.ParseForm(); err != nil {
			return "", errors.New("geçersiz form callback gövdesi")
		}
		token = strings.TrimSpace(r.PostForm.Get("token"))
	default:
		return "", fmt.Errorf("desteklenmeyen callback içerik türü: %s", contentType)
	}

	if token == "" {
		return "", errors.New("token zorunludur")
	}
	if len(token) > 255 {
		return "", errors.New("callback token geçersiz")
	}
	return token, nil
}

func (h *PaymentHandler) callback(w http.ResponseWriter, r *http.Request) {
	token, err := parseIyzicoCallbackToken(w, r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := h.service.HandleCallbackToken(r.Context(), token); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "processed",
		"message": "Ödeme sonucu iyzico üzerinden doğrulandı.",
	})
}
