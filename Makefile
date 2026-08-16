.PHONY: help dev dev-backend dev-frontend backend frontend build install clean

# Default target: show available commands
.DEFAULT_GOAL := help

help:
	@echo "========================================================================"
	@echo "                   Heritage SuperApp Makefile                           "
	@echo "========================================================================"
	@echo "Usage:"
	@echo "  make dev          Run both backend and frontend concurrently in dev mode"
	@echo "  make backend      Run backend in dev mode (church-backend)"
	@echo "  make frontend     Run frontend in dev mode (web)"
	@echo "  make install      Install dependencies for both frontend and backend"
	@echo "  make build        Build production artifacts for backend and frontend"
	@echo "========================================================================"

# Run both backend and frontend concurrently
dev:
	@echo "Starting backend and frontend dev servers concurrently..."
	@$(MAKE) -j 2 dev-backend dev-frontend

# Run Go backend dev server
dev-backend:
	@echo "Starting Backend server (Go)..."
	cd church-backend && go run ./cmd/server

# Run Vite frontend dev server
dev-frontend:
	@echo "Starting Frontend server (Vite/React)..."
	cd web && npm run dev

# Aliases
backend: dev-backend
frontend: dev-frontend

# Install dependencies for both projects
install:
	@echo "Installing frontend dependencies..."
	cd web && npm install
	@echo "Tidying backend Go dependencies..."
	cd church-backend && go mod tidy

# Build production binaries & bundles
build:
	@echo "Building Go backend..."
	cd church-backend && go build -o bin/server ./cmd/server
	@echo "Building Vite frontend..."
	cd web && npm run build

# Production Docker commands
prod-build:
	@echo "Building production Docker images..."
	docker compose -f docker-compose.prod.yml build

prod-up:
	@echo "Starting production stack in background..."
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	@echo "Stopping production stack..."
	docker compose -f docker-compose.prod.yml down

prod-logs:
	@echo "Tailing production stack logs..."
	docker compose -f docker-compose.prod.yml logs -f
