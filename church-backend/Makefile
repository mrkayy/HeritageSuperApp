.PHONY: run dev build lint new-module

run:
	go run ./cmd/server

dev:
	go run github.com/air-verse/air@latest -c .air.toml

build:
	go build -o bin/server ./cmd/server

lint:
	golangci-lint run ./...

# Scaffold a brand new ministry/ops module folder, e.g.:
#   make new-module NAME=events
new-module:
	mkdir -p internal/modules/$(NAME)/migrations
	@echo "package $(NAME)" > internal/modules/$(NAME)/handler.go
	@echo "package $(NAME)" > internal/modules/$(NAME)/service.go
	@echo "package $(NAME)" > internal/modules/$(NAME)/repository.go
	@echo "-- $(NAME) module migrations go here" > internal/modules/$(NAME)/migrations/0001_init.up.sql
	@echo "Scaffolded internal/modules/$(NAME) - now wire it in cmd/server/main.go"

# -----------------------------------------------------------------------------
# V2 Backend Foundation Targets (Port 8081, Postgres 16 on 5433)
# -----------------------------------------------------------------------------
.PHONY: v2-up v2-down v2-migrate v2-seed v2-run v2-test v2-test-unit v2-test-integration v2-boundaries v2-check v2-build

v2-up:
	docker compose -f docker-compose.v2.yml up -d

v2-down:
	docker compose -f docker-compose.v2.yml down

v2-migrate:
	go run ./cmd/migrate-v2 up

v2-seed:
	go run ./cmd/seed-v2

v2-run:
	go run ./cmd/server-v2

v2-test: v2-test-integration

v2-test-unit:
	go test ./internal/v2/...

v2-test-integration:
	./scripts/test-v2.sh

v2-boundaries:
	python3 scripts/check-v2-boundaries.py

v2-check: v2-boundaries
	go build ./...
	go vet ./...
	go test ./...
	./scripts/test-v2.sh

v2-build:
	mkdir -p bin
	go build -o bin/server-v2 ./cmd/server-v2
	go build -o bin/migrate-v2 ./cmd/migrate-v2
	go build -o bin/seed-v2 ./cmd/seed-v2
