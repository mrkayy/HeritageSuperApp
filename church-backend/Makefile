.PHONY: run build lint new-module

run:
	go run ./cmd/server

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
