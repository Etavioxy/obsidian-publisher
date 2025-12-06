# Storage Algorithms Specification

本文档描述 `sled` 和 `orm` 两种存储后端中各函数的实现算法。

---

## 数据库结构

### Sled

| DB 名称 | 说明 | Key 格式 | Value 格式 |
|---------|------|----------|------------|
| `users` | 用户主表 + 用户名索引 | `{uuid}` 或 `username:{username}` | User JSON 或 `{uuid}` bytes |
| `sites` | 站点主表 | `{uuid}` | Site JSON |
| `user_sites` | 用户-站点索引 | `user:{owner_id}:{created_at}:{site_id}` | `{site_id}` bytes |

### ORM (SQLite/Postgres)

| 表名 | 字段 | 说明 |
|------|------|------|
| `users` | `id TEXT PK`, `username TEXT UNIQUE`, `password TEXT`, `created_at TEXT` | 用户表 |
| `sites` | `id TEXT PK`, `owner_id TEXT`, `name TEXT`, `domain TEXT`, `description TEXT`, `created_at TEXT` | 站点表（name 可重复，支持多版本） |

---

## UserStorage 函数

### create(user)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 1. 插入 `{uuid} -> User JSON`<br>2. 插入 `username:{name} -> uuid bytes` (索引) | O(1) |
| **orm** | `INSERT INTO users (...)` | O(1) |

### get(id)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 直接 `db.get(uuid)` | O(1) |
| **orm** | `SELECT * FROM users WHERE id = ?` | O(1) |

### get_by_username(username)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 1. 查索引 `username:{name}` 获取 uuid<br>2. 调用 `get(uuid)` | O(1) |
| **orm** | `SELECT * FROM users WHERE username = ?` | O(1) 有索引 |

### update(user)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 覆盖写入 `{uuid} -> User JSON`（不更新 username 索引） | O(1) |
| **orm** | `UPDATE users SET ... WHERE id = ?` | O(1) |

### delete(id)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 1. 先 `get(id)` 获取用户<br>2. 删除索引 `username:{name}`<br>3. 删除主记录 `{uuid}` | O(1) |
| **orm** | `DELETE FROM users WHERE id = ?` | O(1) |

### list_all()

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 遍历全表，跳过 `username:` 前缀的索引键，按 `created_at` 降序排序 | O(n) |
| **orm** | `SELECT * FROM users ORDER BY created_at DESC` | O(n) |

### count()

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 遍历全表，跳过 `username:` 前缀键，计数 | O(n) |
| **orm** | `SELECT COUNT(*) FROM users` | O(1) 或 O(n) |

---

## SiteStorage 函数

### create(site)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 1. 插入 `{uuid} -> Site JSON` 到 `sites` db<br>2. 插入索引 `user:{owner_id}:{created_at}:{site_id}` 到 `user_sites` db | O(1) |
| **orm** | `INSERT INTO sites (...)` | O(1) |

### get(id)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 直接 `db.get(uuid)` | O(1) |
| **orm** | `SELECT * FROM sites WHERE id = ?` | O(1) |

### get_latest_by_name(name)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 遍历全表，筛选 `site.name == name`，保留 `created_at` 最大的（最新版本） | O(n) |
| **orm** | `SELECT * FROM sites WHERE name = ? ORDER BY created_at DESC LIMIT 1` | O(log n) 有索引 |

**返回**: 该 siteName 的**最新版本** Site（按 `created_at` 降序）

### get_all_by_name(name)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 遍历全表，筛选 `site.name == name`，按 `created_at` 降序排序 | O(n) |
| **orm** | `SELECT * FROM sites WHERE name = ? ORDER BY created_at DESC` | O(k) k=匹配数 |

**返回**: 该 siteName 的**所有版本**列表，按 `created_at` 降序（最新在前）

### update(site)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 1. 读取旧记录，删除旧索引 `user:{old_owner}:{old_date}:{id}`<br>2. 覆盖写入 `{uuid} -> Site JSON`<br>3. 插入新索引 | O(1) |
| **orm** | `UPDATE sites SET ... WHERE id = ?` | O(1) |

### delete(id)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 1. 读取记录，删除索引<br>2. 删除主记录<br>3. 删除文件目录 `site_files_path/{id}` | O(1) + IO |
| **orm** | 1. `DELETE FROM sites WHERE id = ?`<br>2. 删除文件目录 | O(1) + IO |

### list_all()

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 遍历全表，返回所有 Site | O(n) |
| **orm** | `SELECT * FROM sites` | O(n) |

### list_by_owner(owner_id)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled** | 1. 在 `user_sites` db 使用前缀扫描 `user:{owner_id}:`<br>2. 对每个 site_id，从 `sites` db 获取完整记录<br>3. 结果自然按 `created_at` 升序，反转得到降序 | O(k) k=该用户站点数 |
| **orm** | `SELECT * FROM sites WHERE owner_id = ?` | O(k) |

### get_site_files_path(site_id) / get_site_files_path_str(site_id)

| 后端 | 算法 | 复杂度 |
|------|------|--------|
| **sled/orm** | 返回 `site_files_path.join(site_id)` | O(1) |

---

## 索引结构详解

### Sled 用户名索引

```
Key: "username:{username}"
Value: {user_uuid} (16 bytes)
```

- 用于 `get_by_username` 的 O(1) 查找
- `create` 时创建，`delete` 时删除
- `update` 时**不会**自动更新（假设 username 不变）

### Sled 用户-站点索引

```
Key: "user:{owner_id}:{created_at_rfc3339}:{site_id}"
Value: {site_uuid} (16 bytes)
```

- 用于 `list_by_owner` 的高效前缀扫描
- key 包含 `created_at`，使得 `scan_prefix` 结果天然按时间排序
- `create`/`update`/`delete` 时维护

---

## 多版本 Site 说明

同一个 `siteName` 可以有多个版本（多个不同 `site_id` 的记录），每次上传创建新版本：

| 查询 | 返回 |
|------|------|
| `get_latest_by_name("my-site")` | 该 name 的**最新版本**（`created_at` 最大） |
| `get_all_by_name("my-site")` | 该 name 的**所有版本**，按时间降序 |
| `get(uuid)` | 特定版本 |

这允许：
- 版本历史追踪
- 回滚到旧版本（通过 `get_all_by_name` 获取历史）
- 最新版本快速查询（`get_latest_by_name`）
