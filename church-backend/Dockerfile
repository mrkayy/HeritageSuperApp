# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git and ca-certificates for dependencies
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/server ./cmd/server

# Final production stage
FROM alpine:3.20

WORKDIR /app

# Install certificates and timezone data
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled binary from builder
COPY --from=builder /app/bin/server /app/server

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["/app/server"]
