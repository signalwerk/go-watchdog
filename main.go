package main

import (
	"log"
	"os"
	"strings"

	"github.com/pkorpine/go-watchdog/internal/lib"
)

func main() {
	// Get environment variables with defaults
	telegramToken := os.Getenv("TELEGRAM_TOKEN")
	webPrefix := os.Getenv("WEB_PREFIX")
	database := getEnv("DATABASE", "./sqlite.db")
	bind := getEnv("BIND", "127.0.0.1:1234")

	// Get HMAC secret and validate it
	hmacSecret := strings.TrimSpace(os.Getenv("HMAC_SECRET"))
	if hmacSecret == "" || len(hmacSecret) < 20 {
		log.Fatal("HMAC_SECRET environment variable must be set and be at least 20 characters long")
	}

	// Initialize app
	app := &lib.App{}
	app.Initialize(database, telegramToken, webPrefix, hmacSecret)
	defer app.Exit()

	// Run the app
	app.Run(bind)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
