package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"nightbag/internal/core/domain"
)

func (h *BagHandler) register(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !h.authIPLim.allow(ip) || !h.registerIPLim.allow(ip) {
		w.Header().Set("Retry-After", "3600")
		writeJSON(w, http.StatusTooManyRequests, map[string]string{
			"error": "çok fazla kayıt isteği, lütfen daha sonra tekrar deneyin",
		})
		return
	}
	var req struct {
		FullName string                `json:"full_name"`
		Email    string                `json:"email"`
		Password string                `json:"password"`
		Role     string                `json:"role"`
		Business *domain.BusinessInput `json:"business"`
	}
	if !decode(w, r, &req) {
		return
	}
	res, err := h.authSvc.Register(r.Context(), domain.RegisterInput{
		FullName: req.FullName,
		Email:    req.Email,
		Password: req.Password,
		Role:     req.Role,
		Business: req.Business,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, res)
}

func (h *BagHandler) login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decode(w, r, &req) {
		return
	}

	ip := clientIP(r)
	emailHash := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(req.Email))))
	key := ip + "|" + hex.EncodeToString(emailHash[:])
	if !h.authIPLim.allow(ip) || !h.loginLim.allow(key) {
		w.Header().Set("Retry-After", "900")
		writeJSON(w, http.StatusTooManyRequests, map[string]string{
			"error": "çok fazla giriş isteği, lütfen 15 dakika sonra tekrar deneyin",
		})
		return
	}

	res, err := h.authSvc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *BagHandler) myBusiness(w http.ResponseWriter, r *http.Request, ownerID string) {
	b, err := h.authSvc.MyBusiness(r.Context(), ownerID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
}
