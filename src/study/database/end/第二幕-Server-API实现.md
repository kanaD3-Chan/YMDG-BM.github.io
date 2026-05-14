---
title: 第二幕 Server API 实现
order: 2
category:
  - 数据库
---

## 技术栈

| 组件 | Crate | 版本 |
|---|---|---|
| HTTP 框架 | axum | 0.8 |
| 数据库驱动 | sqlx | 0.8（mysql + runtime-tokio） |
| 异步运行时 | tokio | 1（full） |
| 密码哈希 | bcrypt | 0.19 |
| JWT | jsonwebtoken | 10.4（rust_crypto） |
| CORS | tower-http | 0.6 |
| WebSocket | axum 内置 ws 模块 | — |

## 路由设计

```
POST   /api/register              注册
POST   /api/login                 登录
GET    /api/articles              文章列表（分页、分类、搜索）
GET    /api/articles/:id          文章详情（自动+1阅读数）
GET    /api/articles/:id/comments 评论列表
GET    /api/categories            分类列表
GET    /ws                        WebSocket 通知

── 以下需要 JWT ──
POST   /api/articles              发布文章
PUT    /api/articles/:id          编辑文章（作者或管理员）
DELETE /api/articles/:id          删除文章（软删除）
POST   /api/articles/:id/comments 发表评论
GET    /api/members               成员列表（管理员）
PUT    /api/members/:id/role      修改角色（管理员）
DELETE /api/members/:id           删除成员（管理员）
GET    /api/me                    个人信息
PUT    /api/me                    修改昵称/密码
```

## JWT 鉴权中间件

axum 0.8 用 `middleware::from_fn_with_state` 注入鉴权逻辑，验证通过后把 `CurrentUser` 写入 request extensions：

```rust
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let token = req.headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    if let Some(token) = token {
        if let Some(claims) = decode_jwt(token, &state.jwt_secret) {
            req.extensions_mut().insert(CurrentUser { ... });
            return Ok(next.run(req).await);
        }
    }
    Err((StatusCode::UNAUTHORIZED, ...))
}
```

Handler 通过 `FromRequestParts` 提取 `CurrentUser`：

```rust
impl<S: Send + Sync> FromRequestParts<S> for CurrentUser {
    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        parts.extensions.get::<CurrentUser>().cloned()
            .ok_or_else(|| (StatusCode::UNAUTHORIZED, ...))
    }
}
```

::: tip Rust 1.75+ 原生 async trait
axum 0.8 不再需要 `#[async_trait]` 宏，直接用 `async fn` 实现 trait 方法即可。
:::

## WebSocket 实时推送

Server 维护一个 `tokio::sync::broadcast` 通道，每次发布文章或评论时广播通知：

```rust
// AppState 中
pub notify_tx: broadcast::Sender<Notification>,

// 发布文章后
let _ = state.notify_tx.send(Notification {
    kind: "new_article".into(),
    article_id: Some(id),
    author_name: Some(user.username),
    ...
});

// WebSocket handler
async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.notify_tx.subscribe();
    loop {
        tokio::select! {
            Ok(notif) = rx.recv() => {
                socket.send(Message::Text(json)).await?;
            }
            msg = socket.recv() => { /* 心跳/断开处理 */ }
        }
    }
}
```

## 统一响应格式

所有 API 返回 `ApiResponse<T>`：

```json
{ "success": true,  "data": { ... }, "error": null }
{ "success": false, "data": null,    "error": "错误信息" }
```

## 三层架构重构

初版把所有 sqlx 查询直接写在 `handlers.rs` 里，随着接口增多，handler 文件膨胀到 500+ 行，SQL 和业务逻辑混在一起。重构后严格分三层：

```
config.rs          DB/连接层：创建 MySqlPool，定义 AppState
repository/        DAO 层：所有 sqlx 查询封装为 Repo 结构体
  ├── article.rs   ArticleRepo
  ├── comment.rs   CommentRepo
  ├── user.rs      UserRepo
  └── category.rs  CategoryRepo
handlers.rs        UI/交互层：HTTP 解析 + 业务逻辑 + 响应组装，零 sqlx 调用
```

Repo 结构体持有 `&MySqlPool` 的引用，生命周期绑定到请求：

```rust
pub struct ArticleRepo<'a>(pub &'a MySqlPool);

impl<'a> ArticleRepo<'a> {
    pub async fn list(&self, category: Option<&str>, search: Option<&str>,
                      page_size: u32, offset: u32) -> Vec<ArticleWithAuthor> { ... }
    pub async fn find_by_id(&self, id: u32) -> Option<ArticleWithAuthor> { ... }
    pub async fn create(&self, author_id: u32, title: &str, ...) -> Result<u32, sqlx::Error> { ... }
    // ...
}
```

Handler 只需实例化 Repo，不再直接接触 sqlx：

```rust
pub async fn list_articles(State(state): State<Arc<AppState>>, ...) -> ... {
    let repo = ArticleRepo(&state.db);
    let total = repo.count(cat, search).await;
    let articles = repo.list(cat, search, page_size, offset).await;
    Json(ApiResponse::ok(ArticleListResponse { articles, total, ... }))
}
```

::: tip
`ArticleRepo<'a>` 的生命周期参数不是为了复杂性——它只是告诉编译器 Repo 不能比它借用的 Pool 活得更长。实际使用时每个 handler 里直接 `let repo = ArticleRepo(&state.db)` 即可，生命周期自动推断。
:::

## 启动方式

```bash
# 确保 MySQL Docker 已启动
cd ~/mysql && docker compose up -d

# 启动 Server（自动建库建表）
cd ~/db_class_design_rs
cargo run -p forum-server

# 默认监听 0.0.0.0:3000
```
