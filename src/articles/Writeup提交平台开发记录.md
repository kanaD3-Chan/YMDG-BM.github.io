---
title: Writeup 提交平台开发记录
icon: mdi:file-document-edit
category:
  - 文章
tag:
  - 开发
  - Rust
  - Vue
  - CTF
---

ret2shell 一直缺一个 Writeup 提交入口。每次比赛结束后收 WP 都靠群里发文件，乱得很。于是花了几天时间从零写了一个独立平台，这里记录一下整体设计和踩过的坑。

<!-- more -->

## 需求

- CTF 选手登录后，能给指定赛事/训练场上传 Writeup（PDF 或 docx）
- 赛事模式下，以队伍为单位提交，队内任意成员上传即可，覆盖旧版本
- 管理员能看到所有提交，支持单独下载和批量打包下载
- 不单独维护账号体系，直接复用 ret2shell 的 JWT

## 技术选型

| 层 | 选型 |
|---|---|
| 后端 | Rust + axum 0.8 |
| 数据库 | sqlx 0.8 + PostgreSQL 16 |
| 前端 | Vue 3 + TypeScript + Vite + Pinia |
| 文件存储 | 本地文件系统（Docker volume） |
| 认证 | 共享 ret2shell JWT HS256 密钥 |
| 部署 | Docker Compose |

后端选 Rust 主要是想练手，顺便得到一个静态二进制，部署简单。前端四套主题（Apple Light/Dark、Cyberpunk、Frutiger Aero），全部用 CSS 变量切换，组件里不出现任何硬编码颜色。

## 架构

```
writeup-platform/
├── crates/
│   ├── config/        # 配置结构体，读 TOML
│   ├── database/      # sqlx 数据库层（本平台自己的 DB）
│   └── server/        # axum HTTP 服务
│       └── src/
│           ├── middleware/auth.rs   # JWT 验签
│           ├── routes/
│           │   ├── account.rs      # 代理 ret2shell 登录
│           │   ├── game.rs         # 读 ret2shell DB 的游戏列表
│           │   ├── writeup.rs      # 提交/查询/下载
│           │   └── admin.rs        # 管理员接口
│           └── storage.rs          # 文件读写、魔数验证、ZIP 打包
└── frontend/
    └── src/
        ├── stores/auth.ts          # JWT 解析与持久化
        ├── views/
        │   ├── HomeView.vue        # 游戏列表
        │   ├── SubmitView.vue      # 提交页
        │   ├── MyView.vue          # 我的提交
        │   └── AdminView.vue       # 管理员视图
        └── styles/themes/          # 四套主题 CSS
```

两个数据库连接池：一个连本平台自己的 PostgreSQL（写 writeup 记录），一个只读连接 ret2shell 的 PostgreSQL（读 game/team 信息）。

## 数据库设计

```sql
CREATE TABLE writeup (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT        NOT NULL,
    user_account  VARCHAR(255)  NOT NULL,
    user_nickname VARCHAR(255)  NOT NULL,
    team_id       BIGINT,
    team_name     VARCHAR(255),
    game_id       BIGINT        NOT NULL,
    game_name     VARCHAR(255)  NOT NULL,
    file_path     VARCHAR(1024) NOT NULL,
    file_name     VARCHAR(255)  NOT NULL,
    file_size     BIGINT        NOT NULL,
    file_type     VARCHAR(10)   NOT NULL,
    file_hash     VARCHAR(64)   NOT NULL,
    submitted_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_game UNIQUE (user_id, game_id),
    CONSTRAINT uq_team_game UNIQUE (team_id, game_id)
);
```

训练场按 `(user_id, game_id)` 唯一，赛事按 `(team_id, game_id)` 唯一。UPSERT 时根据 host_type 选择走哪个约束。

## 提交逻辑

1. 验证 game 是否可提交（训练场：未隐藏；赛事：进行中，即 `start_at <= now < archive_at`）
2. 赛事模式下查用户所属队伍，未注册队伍拒绝提交
3. 读取文件，验证魔数（PDF: `%PDF`；docx: `PK\x03\x04` + ZIP 内含 `[Content_Types].xml`）
4. SHA-256 去重，同一 game 内不允许不同队伍提交完全相同的文件
5. 写文件到 `{storage_root}/{game_id}/{user_id}-{nanoid}.{ext}`
6. UPSERT 数据库记录，成功后删除旧文件
7. 管理员可绕过所有限制（时间、队伍、去重）

文件名统一格式化为 `{game_name}-{team_name 或 user_account}.{ext}`，方便管理员下载后直接识别。

## 认证

ret2shell 用 HS256 JWT，payload 结构：

```json
{
  "id": 1,
  "account": "kana_de",
  "nickname": "KanaD3",
  "permissions": [0, 5],
  "exp": 1234567890
}
```

`permissions` 里 `0` 是普通用户，`5` 是游戏管理员。管理员判断：`permissions.contains(5) && game.admins.contains(user_id)`。

登录走代理：前端请求本平台的 `/api/account/login`，后端用 reqwest 转发到 ret2shell，透传 `Set-Token` 响应头。

## 踩坑

### jsonwebtoken 与 rustls CryptoProvider 冲突

`jsonwebtoken` 默认 feature 是 `aws_lc_rs`，`reqwest` 默认拉 `rustls`，两者都注册进程级 CryptoProvider，启动时 panic。试了好几种 feature 组合都没解决，最后直接删掉 `jsonwebtoken`，用 `hmac` + `sha2` + `base64` 手写 HS256，反而更干净：

```rust
fn verify_hs256(header_b64: &str, payload_b64: &str, sig: &str, secret: &[u8]) -> bool {
    let msg = format!("{}.{}", header_b64, payload_b64);
    let mut mac = HmacSha256::new_from_slice(secret).unwrap();
    mac.update(msg.as_bytes());
    let expected = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    constant_time_eq(expected.as_bytes(), sig.as_bytes())
}
```

### musl 静态二进制连 PostgreSQL 报 EOF

`x86_64-unknown-linux-musl` 编译后连 PostgreSQL 报 `expected to read 5 bytes, got 0 bytes at EOF`。原因是 musl 下 sqlx 默认尝试 TLS 握手，但没有系统 CA 证书。显式关掉：

```rust
let opts = PgConnectOptions::from_str(dsn)?.ssl_mode(PgSslMode::Disable);
```

### docker cp 后 docker restart 覆盖文件

`docker restart` 会从镜像重新启动，`docker cp` 进去的文件就没了。正确姿势：

```bash
docker stop <container>
docker cp ./writeup-server <container>:/usr/local/bin/writeup-server
docker start <container>
```

### 中文文件名下载乱码

`Content-Disposition` 要用 RFC 5987 编码，同时提供 fallback：

```
Content-Disposition: attachment; filename="xxx.pdf"; filename*=UTF-8''%E4%B8%AD%E6%96%87.pdf
```

前端用原生 `fetch` 下载（axios 的 blob 模式拿不到 `Content-Disposition`），手动解析 `filename*=UTF-8''...`：

```typescript
const star = cd.match(/filename\*=UTF-8''([^;]+)/i)
a.download = star ? decodeURIComponent(star[1]) : fallback
```

### JWT payload 中文 nickname 乱码

`atob()` 返回 Latin-1 字节串，直接 `JSON.parse` 会乱码。正确做法：

```typescript
const decoded = decodeURIComponent(
  atob(b64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
)
```

### 谷歌字体 CDN 大陆不可用

把字体文件下载到 `public/fonts/` 本地化。注意：loli.net 等镜像站根据 User-Agent 返回不同格式，默认 UA 给 `.ttf`，Chrome UA 才给 `.woff2`。下载 CSS 和字体文件要用同一个 UA，否则 CSS 里的 URL 和实际文件对不上。

### axum 默认 body limit 2MB

传了个 3.8MB 的 PDF，前端报 `Error parsing multipart/form-data request`。查了半天发现 axum 默认 body limit 是 2MB，超过就直接拒绝，连 Multipart extractor 都到不了。

```rust
Router::new()
    .layer(DefaultBodyLimit::max(55 * 1024 * 1024))
```

### k8s pod IP 重启即变，必须用 Service ClusterIP

数据库连的是 ret2shell 的 PostgreSQL StatefulSet pod，配置里写死了 pod IP `10.42.0.46`。服务器一重启，k3s 给 pod 分配了新 IP `10.42.1.16`，服务直接崩了。

正确做法是用 k8s Service 的 ClusterIP——StatefulSet 都有对应的 Service，ClusterIP 是稳定的：

```toml
[r2s_database]
host = "10.43.198.186"   # ret2shell-postgresql Service ClusterIP，不会变
```

## API 一览

```
# 认证（代理 ret2shell）
GET  /api/account/captcha
POST /api/account/login

# 游戏列表
GET  /api/games

# Writeup（需登录）
POST /api/writeup/{game_id}          # 提交/更新
GET  /api/writeup                    # 我的所有提交
GET  /api/writeup/{game_id}          # 我对某 game 的提交
GET  /api/writeup/{game_id}/file     # 下载自己的文件

# 管理员（需 permission=5 且在 game.admins 中）
GET    /api/admin/game/{game_id}/writeup              # 所有提交列表
GET    /api/admin/game/{game_id}/writeup/download     # 批量 ZIP 下载
GET    /api/admin/game/{game_id}/writeup/{user_id}/file  # 下载指定用户文件
DELETE /api/admin/game/{game_id}/writeup/{user_id}    # 删除
```

## 部署

三个容器：`postgres`（本平台数据库）、`server`（Rust 后端）、`frontend`（nginx 静态文件 + 反代）。

nginx 把 `/api/` 反代到后端，其余走前端静态文件。后端直连 ret2shell 的 PostgreSQL（只读），不经过 nginx。

```yaml
services:
  postgres:
    image: postgres:16-alpine
  server:
    volumes:
      - ./config:/etc/writeup-platform:ro
      - writeup_storage:/var/lib/writeup-platform/storage
  frontend:
    ports:
      - "${LISTEN_PORT:-3000}:80"
```

Rust 编译用 `x86_64-unknown-linux-musl` 静态链接，最终二进制约 10MB，无运行时依赖。
