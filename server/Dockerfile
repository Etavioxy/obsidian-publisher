# Multi-stage Dockerfile for obsidian-publisher server
# 支持三种 feature 构建: sled, orm, debug_sled_and_orm
# 镜像名称: observer

# Build stage
FROM rust:bookworm AS builder
WORKDIR /usr/src/server

# Feature 参数 default:orm
ARG FEATURES="orm"

# Copy manifest and source
COPY Cargo.toml Cargo.lock ./

# Install dependencies
RUN cargo fetch
# Cache build of dependencies
RUN cargo build --release || true
# Copy source
COPY src ./src 

# Debug: print the copied src/main.rs into build logs
# use `--progress=plain`
#RUN echo "----- src/main.rs ----" && cat src/main.rs || true

# Build release with specified features
RUN cargo build --release --no-default-features --features "${FEATURES}"

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /usr/src/server/target/release/obsidian-publisher-server /usr/local/bin/obsidian-publisher-server

EXPOSE 8080

ENV RUST_LOG=info

CMD ["/usr/local/bin/obsidian-publisher-server", "--config", "./config.json"]
