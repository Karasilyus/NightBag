package handlers

import (
	"net"
	"net/http"
	"sync"
	"time"
)

const maxRateLimitKeys = 10_000

type loginLimiter struct {
	mu          sync.Mutex
	hits        map[string][]time.Time
	max         int
	window      time.Duration
	lastCleanup time.Time
}

func newLoginLimiter(max int, window time.Duration) *loginLimiter {
	return &loginLimiter{
		hits:   make(map[string][]time.Time),
		max:    max,
		window: window,
	}
}

func newDefaultLoginLimiter() *loginLimiter {
	return newLoginLimiter(5, 15*time.Minute)
}

func (l *loginLimiter) prune(key string, now time.Time) []time.Time {
	recent := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if now.Sub(t) < l.window {
			recent = append(recent, t)
		}
	}
	if len(recent) == 0 {
		delete(l.hits, key)
		return nil
	}
	l.hits[key] = recent
	return recent
}

func (l *loginLimiter) cleanup(now time.Time) {
	if now.Sub(l.lastCleanup) < time.Minute {
		return
	}
	for key := range l.hits {
		l.prune(key, now)
	}
	l.lastCleanup = now
}

func (l *loginLimiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	l.cleanup(now)
	recent := l.prune(key, now)
	if len(recent) >= l.max {
		return false
	}
	if len(recent) == 0 && len(l.hits) >= maxRateLimitKeys {
		return false
	}
	l.hits[key] = append(recent, now)
	return true
}

func clientIP(r *http.Request) string {
	remoteHost, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		remoteHost = r.RemoteAddr
	}
	remoteIP := net.ParseIP(remoteHost)
	if remoteIP == nil {
		return remoteHost
	}
	if remoteIP.IsPrivate() || remoteIP.IsLoopback() {
		if forwardedIP := net.ParseIP(r.Header.Get("X-Real-IP")); forwardedIP != nil {
			return forwardedIP.String()
		}
	}
	return remoteIP.String()
}
