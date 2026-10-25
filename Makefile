.PHONY: help up down migrate seed dev dev-backend dev-frontend backend frontend install build clean test test-unit check lint

# Default target: show available commands
.DEFAULT_GOAL := help

help:
	@echo "========================================================================"
	@echo "                   Heritage SuperApp — Root Makefile                    "
	@echo "========================================================================"
	@echo "Database & Lifecycle:"
	@echo "  make up               Start PostgreSQL 16 container (church-backend)"
	@echo "  make down             Stop PostgreSQL container"
	@echo "  make migrate          Apply versioned SQL migrations as DB owner"
	@echo "  make seed             Seed synthetic test & development fixtures"
	@echo ""
	@echo "Development Servers:"
	@echo "  make dev              Run backend and frontend concurrently"
	@echo "  make backend          Run Go backend API server (:8081)"
	@echo "  make frontend         Run Vite frontend dev server (:5173)"
	@echo ""
	@echo "Testing & Quality Verification:"
	@echo "  make test             Run full integration test suite in disposable DB"
	@echo "  make test-unit        Run unit tests in church-backend"
	@echo "  make lint             Run linters (golangci-lint & eslint)"
	@echo "  make check            Run boundaries, vet, and full test suite"
	@echo ""
	@echo "Setup & Build:"
	@echo "  make install          Install dependencies for both frontend and backend"
	@echo "  make build            Build production artifacts for backend and frontend"
	@echo "  make clean            Clean build artifacts and temporary files"
	@echo "========================================================================"

# -----------------------------------------------------------------------------
# Database Targets (delegated to church-backend)
# -----------------------------------------------------------------------------

up:
	@echo "Starting PostgreSQL 16 container..."
	@$(MAKE) -C church-backend up

down:
	@echo "Stopping PostgreSQL 16 container..."
	@$(MAKE) -C church-backend down

migrate:
	@echo "Running database migrations..."
	@$(MAKE) -C church-backend migrate

seed:
	@echo "Seeding development fixtures..."
	@$(MAKE) -C church-backend seed

# -----------------------------------------------------------------------------
# Development Servers
# -----------------------------------------------------------------------------

dev:
	@echo "Starting backend and frontend dev servers concurrently..."
	@$(MAKE) -j 2 dev-backend dev-frontend

dev-backend:
	@echo "Starting Backend server (Go)..."
	@$(MAKE) -C church-backend run

dev-frontend:
	@echo "Starting Frontend server (Vite/React)..."
	cd web && npm run dev

backend: dev-backend
frontend: dev-frontend

# -----------------------------------------------------------------------------
# Testing & Verification
# -----------------------------------------------------------------------------

test:
	@$(MAKE) -C church-backend test

test-unit:
	@$(MAKE) -C church-backend test-unit

check:
	@$(MAKE) -C church-backend check

lint:
	@echo "Linting backend..."
	@$(MAKE) -C church-backend lint
	@echo "Linting frontend..."
	cd web && npm run lint

# -----------------------------------------------------------------------------
# Dependencies & Builds
# -----------------------------------------------------------------------------

install:
	@echo "Installing frontend dependencies..."
	cd web && npm install
	@echo "Tidying backend Go dependencies..."
	cd church-backend && go mod tidy

build:
	@echo "Building Go backend..."
	@$(MAKE) -C church-backend build
	@echo "Building Vite frontend..."
	cd web && npm run build

clean:
	@$(MAKE) -C church-backend clean
	rm -rf web/dist
