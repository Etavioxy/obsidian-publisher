# Multi-stage Dockerfile for obsidian-publisher server
# Build stage
FROM rust:bookworm AS builder
WORKDIR /usr/src/server

# Copy manifest and source
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY config.json ./config.json

# Build release
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder (assumes package name produces 'server' binary)
## The compiled binary name comes from Cargo.toml package.name
## Copy the actual binary produced by cargo build --release
COPY --from=builder /usr/src/server/target/release/obsidian-publisher-server /usr/local/bin/server

EXPOSE 8080

ENV RUST_LOG=info

CMD ["/usr/local/bin/obsidian-publisher-server", "--config", "./config.json"]
