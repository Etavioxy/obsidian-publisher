This folder contains the backend server.

Storage implementations
- Default (feature `sled`): uses embedded `sled` key-value DB and is the default feature.
- ORM (feature `orm`): uses `sqlx::AnyPool` and supports SQLite (file) or PostgreSQL via `DATABASE_URL`.

Build & run
- Default (sled):
  cargo run -p obsidian-publisher-server --bin obsidian-publisher-server

- ORM with SQLite (file-based):
  cargo run -p obsidian-publisher-server --features orm --bin obsidian-publisher-server

- ORM with Postgres (recommended for production/testing):
  1. Start Postgres with docker-compose:
     docker-compose up -d
  2. Export DATABASE_URL (example):
     $env:DATABASE_URL = "postgres://obsidian:obsidian@127.0.0.1:5432/obsidian"
  3. Run server with orm feature:
     cargo run -p obsidian-publisher-server --features orm --bin obsidian-publisher-server

Testing
- Run tests with default (sled):
  cargo test -p obsidian-publisher-server

- Run tests with ORM (SQLite):
  cargo test -p obsidian-publisher-server --features orm

Notes
- The code provides two storage implementations under `src/storage/sled` and `src/storage/orm`.
- The `Storage::new` function is async; main and tests are updated accordingly.
