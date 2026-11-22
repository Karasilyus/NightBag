package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"nightbag/internal/core/domain"
	"nightbag/internal/repository"
)

type PaymentService struct {
	repo        *repository.PaymentRepository
	apiKey      string
	secretKey   string
	baseURL     string
	callbackURL string
	httpClient  *http.Client
}

type iyzicoHTTPError struct {
	statusCode int
	body       string
}

func (e *iyzicoHTTPError) Error() string {
	return fmt.Sprintf("iyzico hata yanıtı (%d): %s", e.statusCode, e.body)
}

func NewPaymentService(repo *repository.PaymentRepository) *PaymentService {
	baseURL := strings.TrimRight(os.Getenv("IYZICO_BASE_URL"), "/")
	if baseURL == "" {
		baseURL = "https://sandbox-api.iyzipay.com"
	}
	callbackURL := os.Getenv("IYZICO_CALLBACK_URL")
	if callbackURL == "" {
		callbackURL = "http://localhost:8080/api/v1/payments/iyzico/callback"
	}
	return &PaymentService{
		repo: repo, apiKey: os.Getenv("IYZICO_API_KEY"), secretKey: os.Getenv("IYZICO_SECRET_KEY"),
		baseURL: baseURL, callbackURL: callbackURL,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *PaymentService) buildAuthHeader(uriPath string, bodyJSON []byte) string {
	randomKey := fmt.Sprintf("%d", time.Now().UnixNano())
	signatureSource := randomKey + uriPath + string(bodyJSON)
	mac := hmac.New(sha256.New, []byte(s.secretKey))
	_, _ = mac.Write([]byte(signatureSource))
	signature := fmt.Sprintf("%x", mac.Sum(nil))
	authText := fmt.Sprintf("apiKey:%s&randomKey:%s&signature:%s", s.apiKey, randomKey, signature)
	return "IYZWSv2 " + base64.StdEncoding.EncodeToString([]byte(authText))
}

func (s *PaymentService) request(ctx context.Context, uriPath string, payload any) ([]byte, error) {
	if s.apiKey == "" || s.secretKey == "" {
		return nil, errors.New("IYZICO_API_KEY ve IYZICO_SECRET_KEY ortam değişkenleri tanımlanmalı")
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+uriPath, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", s.buildAuthHeader(uriPath, body))
	res, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	responseBody, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 400 {
		return nil, &iyzicoHTTPError{statusCode: res.StatusCode, body: string(responseBody)}
	}
	return responseBody, nil
}

type checkoutInitResponse struct {
	Status              string `json:"status"`
	ErrorMessage        string `json:"errorMessage"`
	Token               string `json:"token"`
	CheckoutFormContent string `json:"checkoutFormContent"`
	PaymentPageURL      string `json:"paymentPageUrl"`
}

type retrieveResponse struct {
	Status        string `json:"status"`
	PaymentStatus string `json:"paymentStatus"`
	PaymentID     string `json:"paymentId"`
	ErrorMessage  string `json:"errorMessage"`
}

type refundResponse struct {
	Status       string  `json:"status"`
	ErrorMessage string  `json:"errorMessage"`
	PaymentID    string  `json:"paymentId"`
	Price        float64 `json:"price"`
	Currency     string  `json:"currency"`
	Retryable    bool    `json:"retryable"`
}

func splitName(name string) (string, string) {
	parts := strings.Fields(strings.TrimSpace(name))
	if len(parts) == 0 {
		return "NightBag", "Kullanici"
	}
	if len(parts) == 1 {
		return parts[0], "Kullanici"
	}
	return parts[0], strings.Join(parts[1:], " ")
}

func (s *PaymentService) StartCheckout(ctx context.Context, userID, listingID string, quantity int, acceptedTerms bool, buyerIP string) (*domain.CheckoutInitResult, error) {
	if s.apiKey == "" || s.secretKey == "" {
		return nil, errors.New("IYZICO_API_KEY ve IYZICO_SECRET_KEY ortam değişkenleri tanımlanmalı")
	}
	order, err := s.repo.CreatePendingPayment(ctx, userID, listingID, quantity, acceptedTerms)
	if err != nil {
		return nil, err
	}
	priceStr := fmt.Sprintf("%.2f", order.TotalAmount)
	name, surname := splitName(order.BuyerName)
	payload := map[string]any{
		"locale": "tr", "conversationId": order.ConversationID,
		"price": priceStr, "paidPrice": priceStr, "currency": "TRY",
		"basketId": order.OrderID, "paymentGroup": "PRODUCT",
		"callbackUrl": s.callbackURL,
		"buyer": map[string]any{
			"id": "NB-" + userID, "name": name, "surname": surname,
			"gsmNumber": "+905350000000", "email": order.BuyerEmail,
			"identityNumber": "11111111111", "registrationAddress": "Türkiye",
			"ip": buyerIP, "city": "Istanbul", "country": "Turkey",
		},
		"shippingAddress": map[string]any{
			"contactName": order.BuyerName, "city": "Istanbul", "country": "Turkey", "address": "Türkiye",
		},
		"billingAddress": map[string]any{
			"contactName": order.BuyerName, "city": "Istanbul", "country": "Turkey", "address": "Türkiye",
		},
		"basketItems": []map[string]any{{
			"id": order.ListingID, "name": order.ListingTitle,
			"category1": "Gida", "itemType": "PHYSICAL", "price": priceStr,
		}},
	}

	const initURI = "/payment/iyzipos/checkoutform/initialize/auth/ecom"
	responseBody, err := s.request(ctx, initURI, payload)
	if err != nil {
		_ = s.repo.FailPendingByConversation(ctx, order.ConversationID, err.Error())
		return nil, err
	}
	var result checkoutInitResponse
	if err := json.Unmarshal(responseBody, &result); err != nil {
		_ = s.repo.FailPendingByConversation(ctx, order.ConversationID, err.Error())
		return nil, err
	}
	if result.Status != "success" || result.Token == "" {
		raw, _ := json.Marshal(result)
		_ = s.repo.FailPendingByConversation(ctx, order.ConversationID, string(raw))
		return nil, fmt.Errorf("iyzico ödeme başlatılamadı: %s", result.ErrorMessage)
	}
	if err := s.repo.SavePaymentToken(ctx, order.OrderID, result.Token, result.PaymentPageURL, result.CheckoutFormContent); err != nil {
		_ = s.repo.FailPendingByConversation(ctx, order.ConversationID, err.Error())
		return nil, err
	}
	paymentPageURL := result.PaymentPageURL
	if paymentPageURL == "" {
		if callbackURL, err := url.Parse(s.callbackURL); err == nil {
			callbackURL.Path = "/api/v1/payments/iyzico/form/" + url.PathEscape(result.Token)
			paymentPageURL = callbackURL.String()
		}
	}
	return &domain.CheckoutInitResult{
		OrderID: order.OrderID, Token: result.Token,
		CheckoutFormContent: result.CheckoutFormContent, PaymentPageURL: paymentPageURL,
	}, nil
}

func (s *PaymentService) HandleCallbackToken(ctx context.Context, token string) error {
	if token == "" {
		return errors.New("token zorunludur")
	}
	const retrieveURI = "/payment/iyzipos/checkoutform/auth/ecom/detail"
	responseBody, err := s.request(ctx, retrieveURI, map[string]any{"locale": "tr", "token": token})
	if err != nil {
		return err
	}
	var detail retrieveResponse
	if err := json.Unmarshal(responseBody, &detail); err != nil {
		return err
	}
	paid := detail.Status == "success" && strings.EqualFold(detail.PaymentStatus, "SUCCESS")
	return s.repo.FinalizeByToken(ctx, token, detail.PaymentID, paid, string(responseBody))
}

func (s *PaymentService) CancelReservation(ctx context.Context, userID, reservationID, clientIP string) error {
	refund, err := s.repo.BeginReservationCancellation(ctx, userID, reservationID)
	if err != nil || refund == nil {
		return err
	}

	payload := map[string]any{
		"locale": "tr", "conversationId": refund.ConversationID,
		"paymentId": refund.PaymentID,
		"price":     fmt.Sprintf("%.2f", refund.Amount),
		"currency":  "TRY", "ip": clientIP,
	}
	responseBody, err := s.request(ctx, "/v2/payment/refund", payload)
	if err != nil {
		var providerErr *iyzicoHTTPError
		if errors.As(err, &providerErr) && providerErr.statusCode < http.StatusInternalServerError {
			retryable := false
			var failed refundResponse
			if json.Unmarshal([]byte(providerErr.body), &failed) == nil {
				retryable = failed.Retryable
			}
			if persistErr := s.repo.SetRefundOutcome(ctx, refund.OrderID, refund.ConversationID, "failed", err.Error(), retryable); persistErr != nil {
				return fmt.Errorf("%w: iade sonucu kaydedilemedi", domain.ErrRefundPending)
			}
			if retryable {
				return fmt.Errorf("%w: iyzico iade isteğini reddetti, yeniden denenebilir", domain.ErrRefundFailed)
			}
			return domain.ErrRefundNotRetryable
		}
		if persistErr := s.repo.SetRefundOutcome(ctx, refund.OrderID, refund.ConversationID, "unknown", err.Error(), false); persistErr != nil {
			return fmt.Errorf("%w: iade sonucu kaydedilemedi", domain.ErrRefundPending)
		}
		return domain.ErrRefundPending
	}

	var result refundResponse
	if err := json.Unmarshal(responseBody, &result); err != nil {
		if persistErr := s.repo.SetRefundOutcome(ctx, refund.OrderID, refund.ConversationID, "unknown", "geçersiz iyzico iade yanıtı", false); persistErr != nil {
			return fmt.Errorf("%w: iade sonucu kaydedilemedi", domain.ErrRefundPending)
		}
		return domain.ErrRefundPending
	}
	if result.Status != "success" {
		reason := result.ErrorMessage
		if reason == "" {
			reason = "iyzico iade isteğini tamamlayamadı"
		}
		if persistErr := s.repo.SetRefundOutcome(ctx, refund.OrderID, refund.ConversationID, "failed", reason, result.Retryable); persistErr != nil {
			return fmt.Errorf("%w: iade sonucu kaydedilemedi", domain.ErrRefundPending)
		}
		if result.Retryable {
			return fmt.Errorf("%w: %s", domain.ErrRefundFailed, reason)
		}
		return domain.ErrRefundNotRetryable
	}

	if result.PaymentID != refund.PaymentID ||
		math.Abs(result.Price-refund.Amount) >= 0.005 ||
		!strings.EqualFold(result.Currency, "TRY") {
		if persistErr := s.repo.SetRefundOutcome(ctx, refund.OrderID, refund.ConversationID, "unknown", "iyzico iade yanıtı siparişle eşleşmedi", false); persistErr != nil {
			return fmt.Errorf("%w: iade sonucu kaydedilemedi", domain.ErrRefundPending)
		}
		return domain.ErrRefundPending
	}
	if err := s.repo.CompleteRefund(ctx, refund.OrderID, refund.ConversationID, refund.PaymentID); err != nil {
		return fmt.Errorf("%w: iade tamamlandı ancak rezervasyon güncellenemedi", domain.ErrRefundPending)
	}
	return nil
}

func (s *PaymentService) Status(ctx context.Context, userID, orderID string) (*domain.PaymentOrderStatus, error) {
	return s.repo.GetStatus(ctx, userID, orderID)
}

func (s *PaymentService) CheckoutForm(ctx context.Context, token string) (string, error) {
	return s.repo.GetCheckoutForm(ctx, token)
}
