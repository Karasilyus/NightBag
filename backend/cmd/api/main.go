package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"nightbag/internal/core/database"
	"nightbag/internal/core/services"
	"nightbag/internal/handlers"
	"nightbag/internal/repository"
)

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func withRecovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Printf("panic recovered: %v", recovered)
				http.Error(w, "sunucu hatası", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func withCORS(origins string, next http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, o := range strings.Split(origins, ",") {
		if o = strings.TrimSpace(o); o != "" {
			allowed[o] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "Origin")
		if allowed["*"] {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if reqOrigin := r.Header.Get("Origin"); allowed[reqOrigin] {
			w.Header().Set("Access-Control-Allow-Origin", reqOrigin)
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Max-Age", "600")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dbURL := getenv("DATABASE_URL", "postgres://nightbag:nightbag@localhost:5432/nightbag?sslmode=disable")
	port := getenv("PORT", "8080")
	corsOrigin := getenv("CORS_ORIGIN", "*")
	isProd := getenv("APP_ENV", "dev") == "production"
	authSecret := getenv("AUTH_SECRET", "")

	if authSecret == "" {
		if isProd {
			log.Fatal("AUTH_SECRET production ortamında zorunlu")
		}
		authSecret = "dev-secret-degistir"
		log.Println("UYARI: AUTH_SECRET tanımlı değil, geliştirme anahtarı kullanılıyor")
	}
	pool, err := database.NewPool(ctx, dbURL)
	if err != nil {
		log.Fatalf("veritabanı: %v", err)
	}
	defer pool.Close()

	go func() {
		t := time.NewTicker(5 * time.Minute)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if _, err := pool.Exec(ctx, `
					UPDATE reservations r SET status = 'expired'
					FROM bag_listings l
					WHERE r.listing_id = l.id AND r.status = 'pending_pickup'
					  AND (l.pickup_date + l.pickup_end) < (now() AT TIME ZONE 'Europe/Istanbul')`); err != nil {
					log.Printf("expire job: %v", err)
				}
			}
		}
	}()

	repo := repository.NewBagRepository(pool)
	svc := services.NewBagService(repo)
	authSvc := services.NewAuthService(repo, authSecret)
	bagHandler := handlers.NewBagHandler(svc, authSvc)

	if !isProd {
		if pw := getenv("SEED_PASSWORD", ""); pw != "" {
			if err := authSvc.EnsureSeedPasswords(ctx, pw); err != nil {
				log.Printf("seed şifreleri: %v", err)
			}
		}

	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			http.Error(w, "db down", http.StatusServiceUnavailable)
			return
		}
		_, _ = w.Write([]byte("ok"))
	})
	bagHandler.Register(mux)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           withCORS(corsOrigin, withLogging(withRecovery(mux))),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("NightBag API :%s üzerinde dinliyor", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case <-ctx.Done():
	case err := <-errCh:
		log.Printf("sunucu: %v", err)
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("kapatma hatası: %v", err)
	}
}
