// Package config is shared platform code - safe for every module to import.
package config

import "os"

type Config struct {
	Port               string
	DatabaseURL        string
	JWTSecret          string
	FrontendURL        string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleCallbackURL  string
}

func Load() Config {
	return Config{
		Port:               getenv("PORT", "3080"),
		DatabaseURL:        getenv("DATABASE_URL", "postgres://postgres:password@localhost:5432/hof_church?sslmode=disable"),
		JWTSecret:          getenv("JWT_SECRET", "dev-secret-change-me"),
		FrontendURL:        getenv("FRONTEND_URL", "http://localhost:5173"),
		GoogleClientID:     getenv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getenv("GOOGLE_CLIENT_SECRET", ""),
		GoogleCallbackURL:  getenv("GOOGLE_CALLBACK_URL", "http://localhost:8080/api/auth/callback/google"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
