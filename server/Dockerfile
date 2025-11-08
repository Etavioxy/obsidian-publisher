# Multi-stage Dockerfile for obsidian-publisher server
# Build stage
FROM rust:bookworm AS builder
WORKDIR /usr/src/server

# Copy manifest and source
COPY Cargo.toml Cargo.lock ./
# Install dependencies
RUN cargo fetch
# Cache build of dependencies
RUN cargo build --release || true
COPY src ./src 

# Debug: print the copied src/main.rs into build logs
# use `--progress=plain`
#RUN echo "----- src/main.rs ----" && cat src/main.rs || true

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
COPY --from=builder /usr/src/server/target/release/obsidian-publisher-server /usr/local/bin/obsidian-publisher-server

EXPOSE 8080

ENV RUST_LOG=info

CMD ["/usr/local/bin/obsidian-publisher-server", "--config", "./config.json"]
