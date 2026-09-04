# ==================================
# Minimal Dockerfile — Rust backend API
# ==================================
FROM rust:1.97.1 AS builder

WORKDIR /src

# Copy entire backend directory
COPY . .

# Build
RUN cargo build --release -p api_gateway

# ==================================
# Runtime
# ==================================
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 curl && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false appuser

WORKDIR /app
COPY --from=builder /src/target/release/api_gateway /app/api_gateway
COPY --from=builder /src/migrations /app/migrations

USER appuser
ENV RUST_LOG=info
EXPOSE 8080 9090

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health/live || exit 1

CMD ["./api_gateway"]
