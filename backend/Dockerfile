# ==================================
# Build Stage — compiles entire Rust workspace
# ==================================
# 1.82 could not parse the manifest of time-macros 0.2.26 (a transitive dep),
# which failed every build. Pinned, not floating, per the dependency rules.
FROM rust:1.97.1-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
  pkg-config \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace manifest first for dependency caching
COPY backend/Cargo.toml ./Cargo.toml
COPY backend/Cargo.lock ./Cargo.lock

# Copy all workspace members (build context is repo root)
COPY backend/api_gateway ./api_gateway
COPY backend/auth_service ./auth_service
COPY backend/persona_service ./persona_service
COPY backend/social_service ./social_service
COPY backend/analytics_service ./analytics_service
COPY backend/recommendation_service ./recommendation_service
COPY backend/ai_service ./ai_service
COPY backend/notification_service ./notification_service
COPY backend/referral_service ./referral_service
COPY backend/marketplace_service ./marketplace_service
COPY backend/waitlist_service ./waitlist_service
COPY backend/brand_api ./brand_api
COPY backend/communities_service ./communities_service
COPY backend/credential_service ./credential_service
COPY backend/matching_service ./matching_service
COPY backend/settings_service ./settings_service
COPY backend/linkedin_service ./linkedin_service
COPY backend/platform_service ./platform_service
COPY backend/pricing_service ./pricing_service
COPY backend/credit_service ./credit_service
COPY backend/contract_service ./contract_service
COPY backend/reputation_service ./reputation_service
COPY backend/account_service ./account_service
COPY backend/payment_service ./payment_service
COPY backend/storage_service ./storage_service
COPY backend/tax_service ./tax_service
COPY backend/identity_service ./identity_service
COPY backend/guardian_service ./guardian_service
COPY backend/trust_service ./trust_service
COPY backend/risk_engine ./risk_engine
COPY backend/verification_service ./verification_service
COPY backend/moderation_service ./moderation_service
COPY backend/events_service ./events_service
COPY backend/indexer ./indexer
COPY backend/shared ./shared
COPY backend/migrations ./migrations

# Build release binaries
RUN cargo build --release --workspace

# ==================================
# Runtime Stage — minimal image, single binary
# ==================================
FROM debian:bookworm-slim AS api

RUN apt-get update && apt-get install -y \
  ca-certificates \
  libssl3 \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN useradd -r -s /bin/false appuser

WORKDIR /app
COPY --from=builder /app/target/release/api_gateway /app/api_gateway
COPY --from=builder /app/migrations /app/migrations

# Drop privileges
USER appuser

ENV RUST_LOG=info
EXPOSE 8080 9090

# Graceful shutdown: SIGTERM handled by Actix
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health/live || exit 1

CMD ["./api_gateway"]
