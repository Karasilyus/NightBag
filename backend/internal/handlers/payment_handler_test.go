package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParseIyzicoCallbackToken(t *testing.T) {
	tests := []struct {
		name        string
		method      string
		target      string
		contentType string
		body        string
		want        string
		wantErr     bool
	}{
		{
			name:   "GET query token",
			method: http.MethodGet,
			target: "/callback?token=query-token",
			want:   "query-token",
		},
		{
			name:        "POST urlencoded token",
			method:      http.MethodPost,
			target:      "/callback",
			contentType: "application/x-www-form-urlencoded",
			body:        "token=form-token",
			want:        "form-token",
		},
		{
			name:        "POST multipart token",
			method:      http.MethodPost,
			target:      "/callback",
			contentType: "multipart/form-data; boundary=callback-boundary",
			body:        "--callback-boundary\r\nContent-Disposition: form-data; name=\"token\"\r\n\r\nmultipart-token\r\n--callback-boundary--\r\n",
			want:        "multipart-token",
		},
		{
			name:        "POST JSON token",
			method:      http.MethodPost,
			target:      "/callback",
			contentType: "application/json",
			body:        `{"token":"json-token"}`,
			want:        "json-token",
		},
		{
			name:    "missing token",
			method:  http.MethodGet,
			target:  "/callback",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(tt.method, tt.target, strings.NewReader(tt.body))
			if tt.contentType != "" {
				request.Header.Set("Content-Type", tt.contentType)
			}
			recorder := httptest.NewRecorder()

			got, err := parseIyzicoCallbackToken(recorder, request)
			if (err != nil) != tt.wantErr {
				t.Fatalf("parseIyzicoCallbackToken() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("parseIyzicoCallbackToken() = %q, want %q", got, tt.want)
			}
		})
	}
}
