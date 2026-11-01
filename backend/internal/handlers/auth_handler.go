package handlers

import (
	"net/http"

	"nightbag/internal/core/domain"
)

// POST /api/v1/auth/register
// Müşteri:        {"full_name":"Ali Veli","email":"ali@x.com","password":"12345678"}
// İşletme sahibi: {"full_name":"...","email":"...","password":"...","role":"business_owner",
//
//	"business":{"name":"Moda Fırını","category":"firin","address":"Moda Cd. 1",
//	            "district":"Kadıköy","lat":40.98,"lon":29.025}}
func (h *BagHandler) register(w http.ResponseWriter, r *http.Request) {
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

// POST /api/v1/auth/login   gövde: {"email":"...","password":"..."}
func (h *BagHandler) login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decode(w, r, &req) {
		return
	}
	res, err := h.authSvc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

// GET /api/v1/business/me   işletme sahibinin işletme bilgisi (panel ve ilan yayınlama için)
func (h *BagHandler) myBusiness(w http.ResponseWriter, r *http.Request, ownerID string) {
	b, err := h.authSvc.MyBusiness(r.Context(), ownerID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
}
