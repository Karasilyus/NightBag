package services

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (fn roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestSendPushAcceptsExpoSuccessTicket(t *testing.T) {
	dispatcher := &NotificationDispatcher{
		client: &http.Client{Transport: roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			if req.Method != http.MethodPost || req.Header.Get("Authorization") != "Bearer access-token" {
				t.Fatalf("istek başlığı veya yöntemi beklenenden farklı: %s %s", req.Method, req.Header.Get("Authorization"))
			}
			var payload struct {
				To   string            `json:"to"`
				Body string            `json:"body"`
				Data map[string]string `json:"data"`
			}
			if err := json.NewDecoder(req.Body).Decode(&payload); err != nil {
				t.Fatal(err)
			}
			if payload.To != "ExpoPushToken[abc123]" || payload.Body != "Teslim hatırlatması" ||
				payload.Data["reservationId"] != "reservation-id" {
				t.Fatalf("beklenmeyen push içeriği: %+v", payload)
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"data":{"status":"ok","id":"ticket-id"}}`)),
				Header:     make(http.Header),
			}, nil
		})},
		accessToken: "access-token",
	}

	delivered, invalidToken, err := dispatcher.sendPush(
		t.Context(), "ExpoPushToken[abc123]", "Teslim hatırlatması", "reservation-id",
	)
	if err != nil || !delivered || invalidToken {
		t.Fatalf("başarılı Expo bileti bekleniyordu; delivered=%t invalidToken=%t err=%v", delivered, invalidToken, err)
	}
}

func TestSendPushIdentifiesUnregisteredDevice(t *testing.T) {
	dispatcher := &NotificationDispatcher{
		client: &http.Client{Transport: roundTripperFunc(func(*http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"data":{"status":"error","details":{"error":"DeviceNotRegistered"}}}`)),
				Header:     make(http.Header),
			}, nil
		})},
	}

	delivered, invalidToken, err := dispatcher.sendPush(
		t.Context(), "ExpoPushToken[abc123]", "Teslim hatırlatması", "reservation-id",
	)
	if err != nil || delivered || !invalidToken {
		t.Fatalf("kayıtsız cihaz bileti bekleniyordu; delivered=%t invalidToken=%t err=%v", delivered, invalidToken, err)
	}
}
