package services

import (
	"testing"
	"time"
)

func TestPasswordHashing(t *testing.T) {
	h, err := hashPassword("gizli-sifre-1")
	if err != nil {
		t.Fatal(err)
	}
	if !verifyPassword("gizli-sifre-1", h) {
		t.Fatal("doğru şifre reddedildi")
	}
	if verifyPassword("yanlis", h) {
		t.Fatal("yanlış şifre kabul edildi")
	}
	if verifyPassword("x", "bozuk-hash") {
		t.Fatal("bozuk hash kabul edildi")
	}
}

func TestTokenRoundTrip(t *testing.T) {
	s := NewAuthService(nil, "test-secret", false)
	uid := "11111111-1111-1111-1111-111111111111"
	tok := s.issueToken(uid)
	got, ok := s.parseToken(tok)
	if !ok || got != uid {
		t.Fatalf("token çözülemedi: %v %v", got, ok)
	}
	if _, ok := s.parseToken(tok + "x"); ok {
		t.Fatal("bozulmuş token kabul edildi")
	}
	other := NewAuthService(nil, "baska-secret", false)
	if _, ok := other.parseToken(tok); ok {
		t.Fatal("farklı anahtarla imzalı token kabul edildi")
	}
	_ = time.Now
}
