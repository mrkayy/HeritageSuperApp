.PHONY: help run dev build lint up down migrate seed test test-unit test-integration check boundaries clean

.DEFAULT_GOAL := help

# Default environment defaults if not set in environment
V2_OWNER_DATABASE_URL ?= postgres://hof_v2_user:hof_v2_pass@127.0.0.1:5433/hof_v2_dev?sslmode=disable
V2_DATABASE_URL ?= postgres://hof_v2_runtime:hof_v2_runtime_dev@127.0.0.1:5433/hof_v2_dev?sslmode=disable
V2_PORT ?= 8081
V2_ENVIRONMENT ?= development

# -----------------------------------------------------------------------------
# Help & Usage Hint
# -----------------------------------------------------------------------------

help:
	@echo ""
	@echo "Heritage SuperApp — Backend CLI Commands"
	@echo "========================================="
	@echo ""
	@echo "Database & Lifecycle:"
	@echo "  make up               Start PostgreSQL 16 container on port 5433"
	@echo "  make down             Stop PostgreSQL container"
	@echo "  make migrate          Apply versioned SQL migrations as DB owner"
	@echo "  make seed             Seed synthetic test & development fixtures"
	@echo "  make clean            Remove build binaries and log files"
	@echo ""
	@echo "Server Execution:"
	@echo "  make run              Start V2 API HTTP server on port 8081 (restricted runtime role)"
	@echo "  make dev              Start server with Air live-reload"
	@echo "  make build            Compile server, migrate, and seed binaries to bin/"
	@echo ""
	@echo "Testing & Quality Verification:"
	@echo "  make test             Run full integration & acceptance tests in disposable DB"
	@echo "  make test-unit        Run fast unit tests against internal/v2/..."
	@echo "  make test-integration Alias for make test"
	@echo "  make boundaries       Verify direct import boundaries and zero fixture leakage"
	@echo "  make check            Run boundaries, build, vet, unit tests, and smoke test harness"
	@echo "  make lint             Run golangci-lint across all packages"
	@echo ""
	@echo "Quick Start Workflow:"
	@echo "  1. make up"
	@echo "  2. make migrate"
	@echo "  3. make seed"
	@echo "  4. make run"
	@echo ""

# -----------------------------------------------------------------------------
# Primary Development & Runtime Targets (V2 Main Codebase)
# -----------------------------------------------------------------------------

up:
	docker compose up -d

down:
	docker compose down

migrate:
	V2_DATABASE_URL="$(V2_OWNER_DATABASE_URL)" go run ./cmd/migrate up

seed:
	V2_DATABASE_URL="$(V2_OWNER_DATABASE_URL)" go run ./cmd/seed

run:
	V2_DATABASE_URL="$(V2_DATABASE_URL)" V2_PORT="$(V2_PORT)" V2_ENVIRONMENT="$(V2_ENVIRONMENT)" go run ./cmd/server

dev:
	V2_DATABASE_URL="$(V2_DATABASE_URL)" V2_PORT="$(V2_PORT)" V2_ENVIRONMENT="$(V2_ENVIRONMENT)" go run github.com/air-verse/air@latest -c .air.toml

test: test-integration

test-unit:
	go test -count=1 ./internal/v2/...

test-integration:
	./scripts/test-v2.sh

boundaries:
	python3 scripts/check-v2-boundaries.py

lint:
	golangci-lint run ./...

check: boundaries
	go build ./...
	go vet ./...
	go test ./...
	./scripts/test-v2.sh

build:
	mkdir -p bin
	go build -o bin/server ./cmd/server
	go build -o bin/migrate ./cmd/migrate
	go build -o bin/seed ./cmd/seed

clean:
	rm -rf bin app.log
