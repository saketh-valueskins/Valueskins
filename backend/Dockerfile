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
COPY Cargo.toml Cargo.lock ./

# Copy all workspace members
COPY api_gateway ./api_gateway
COPY auth_service ./auth_service
COPY persona_service ./persona_service
COPY social_service ./social_service
COPY analytics_service ./analytics_service
COPY recommendation_service ./recommendation_service
COPY ai_service ./ai_service
COPY notification_service ./notification_service
COPY referral_service ./referral_service
COPY marketplace_service ./marketplace_service
COPY waitlist_service ./waitlist_service
COPY brand_api ./brand_api
COPY communities_service ./communities_service
COPY credential_service ./credential_service
COPY matching_service ./matching_service
COPY settings_service ./settings_service
COPY linkedin_service ./linkedin_service
COPY platform_service ./platform_service
COPY pricing_service ./pricing_service
COPY credit_service ./credit_service
COPY contract_service ./contract_service
COPY reputation_service ./reputation_service
# These 11 are declared in Cargo.toml [workspace].members but were never copied,
# so `cargo build --workspace` failed on the first one it reached
# (account_service). Every deploy of this image has been broken.
COPY account_service ./account_service
COPY payment_service ./payment_service
COPY storage_service ./storage_service
COPY tax_service ./tax_service
COPY identity_service ./identity_service
COPY guardian_service ./guardian_service
COPY trust_service ./trust_service
COPY risk_engine ./risk_engine
COPY verification_service ./verification_service
COPY moderation_service ./moderation_service
COPY events_service ./events_service
COPY indexer ./indexer
COPY shared ./shared
COPY migrations ./migrations

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
