package services

import (
	"strconv"
	"testing"
	"time"
)

func TestPasswordHashing(t *testing.T) {
	h, err := hashPassword("gizli-sifre-1")
	if err != nil {
		t.Fatal(err)
	}
	if passwordHashNeedsRehash(h) {
		t.Fatal("yeni parola özeti yeniden hash gerektiriyor")
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

func TestLegacyPasswordHashNeedsRehash(t *testing.T) {
	const legacyIterations = 120_000
	h, err := hashPasswordWithIterations("eski-sifre", legacyIterations)
	if err != nil {
		t.Fatal(err)
	}
	if !verifyPassword("eski-sifre", h) {
		t.Fatal("eski PBKDF2 özeti reddedildi")
	}
	if !passwordHashNeedsRehash(h) {
		t.Fatal("düşük iterasyonlu özetin yenilenmesi gerekiyor")
	}
}

func TestTokenRoundTrip(t *testing.T) {
	s := NewAuthService(nil, "test-secret")
	uid := "11111111-1111-1111-1111-111111111111"
	tok := s.issueToken(uid, 2)
	got, version, ok := s.parseToken(tok)
	if !ok || got != uid || version != 2 {
		t.Fatalf("token çözülemedi: %v %v", got, ok)
	}
	if _, _, ok := s.parseToken(tok + "x"); ok {
		t.Fatal("bozulmuş token kabul edildi")
	}
	other := NewAuthService(nil, "baska-secret")
	if _, _, ok := other.parseToken(tok); ok {
		t.Fatal("farklı anahtarla imzalı token kabul edildi")
	}

	legacyPayload := uid + "|" + strconv.FormatInt(time.Now().Add(tokenTTL).Unix(), 10)
	legacyToken := b64.EncodeToString([]byte(legacyPayload)) + "." + s.sign(legacyPayload)
	if got, version, ok := s.parseToken(legacyToken); !ok || got != uid || version != 0 {
		t.Fatal("önceki sürüm token'ı desteklenmedi")
	}
}
