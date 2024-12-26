# Build stage
FROM golang:1.23 AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y gcc libc6-dev

# Copy go mod files first for better cache utilization
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -tags sqlite_omit_load_extension -ldflags="-extldflags=-static" -o watchdog

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Copy the binary from builder
COPY --from=builder /app/watchdog .

# Copy static files
COPY static/ ./static/

# Create directory for database
RUN mkdir -p /data

# Set environment variables
ENV DATABASE=/data/sqlite.db
ENV BIND=0.0.0.0:1234

CMD ["./watchdog"] 