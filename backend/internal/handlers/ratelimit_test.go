package handlers

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestLoginLimiterCountsRequestsAndPrunesKeys(t *testing.T) {
	limiter := newLoginLimiter(2, time.Minute)
	if !limiter.allow("client") || !limiter.allow("client") {
		t.Fatal("limit altındaki istekler kabul edilmeliydi")
	}
	if limiter.allow("client") {
		t.Fatal("limit üzerindeki istek reddedilmeliydi")
	}

	limiter.hits["expired"] = []time.Time{time.Now().Add(-2 * time.Minute)}
	limiter.lastCleanup = time.Time{}
	if !limiter.allow("new-client") {
		t.Fatal("temizlenen limit tablosunda yeni istemci kabul edilmeliydi")
	}
	if _, ok := limiter.hits["expired"]; ok {
		t.Fatal("süresi dolmuş istemci girdisi temizlenmeliydi")
	}
}

func TestClientIPUsesProxyHeaderOnlyForPrivatePeer(t *testing.T) {
	request := httptest.NewRequest("GET", "/", nil)
	request.RemoteAddr = "172.20.0.2:8080"
	request.Header.Set("X-Real-IP", "203.0.113.25")
	if got := clientIP(request); got != "203.0.113.25" {
		t.Fatalf("proxy IP'si kullanılmadı: %q", got)
	}

	request.RemoteAddr = "198.51.100.10:8080"
	request.Header.Set("X-Real-IP", "203.0.113.25")
	if got := clientIP(request); got != "198.51.100.10" {
		t.Fatalf("güvenilmeyen X-Real-IP kabul edildi: %q", got)
	}
}
