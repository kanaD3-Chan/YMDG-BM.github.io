---
title: 第二幕：Rust 连接数据库——快递驿站系统实现
order: 2
category:
  - 数据库
---

上一幕我们用手敲 SQL 完成了驿站的全部查询。但真实场景里，站长不会写 SQL——他需要一个程序。这一章是课上项目，老师要求用 Python + pymysql，但我选择用 Rust + sqlx 实现。

<!-- more -->

## 技术栈

| 层 | 技术 |
|---|---|
| 数据库 | MySQL 8.0（Docker 部署） |
| 驱动 | sqlx 0.8（异步、编译期 SQL 校验） |
| 运行时 | tokio（异步运行时） |
| 项目结构 | 三层分离：models / sqls / utils / main |

## 项目结构

```
db_rust/
├── Cargo.toml
├── docker-compose.yml      # MySQL + App 一键部署
├── Dockerfile              # 多阶段构建
├── .env                    # DATABASE_URL
├── sql/
│   └── init.sql            # 建库建表 + 初始数据
└── src/
    ├── main.rs             # 菜单 + 主循环（交互层）
    ├── models.rs           # 数据结构（对应表结构）
    ├── sqls.rs             # 所有 SQL 操作（数据访问层）
    └── utils.rs            # 交互命令实现
```

## 依赖配置

```toml
[package]
name = "db_rust"
version = "0.1.0"
edition = "2024"

[dependencies]
chrono = "0.4"
dotenvy = "0.15"
sqlx = { version = "0.8", features = ["chrono", "mysql", "runtime-tokio"] }
tokio = { version = "1.51", features = ["full"] }
```

## 数据模型（models.rs）

用 `sqlx::FromRow` 宏自动将查询结果映射到 Rust 结构体：

```rust
use chrono::NaiveDateTime;
use sqlx::FromRow;

#[derive(Debug, FromRow)]
pub struct Shelf {
    pub shelf_id: i32,
    pub shelf_code: String,
    pub area: String,
    pub capacity: i32,
    pub current_count: i32,
}

#[derive(Debug, FromRow)]
pub struct Package {
    pub package_id: i32,
    pub tracking_no: String,
    pub recipient_name: String,
    pub recipient_phone: String,
    pub shelf_id: Option<i32>,
    pub courier_company: String,
    pub status: String,
    pub arrival_time: NaiveDateTime,
    pub pickup_time: Option<NaiveDateTime>,
    pub pickup_code: String,
}

#[derive(Debug, FromRow)]
pub struct Complaint {
    pub complaint_id: i32,
    pub package_id: i32,
    pub complaint_type: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: NaiveDateTime,
}

// 货架统计视图——在 Rust 侧计算衍生字段
#[derive(Debug)]
pub struct ShelfStat {
    pub shelf_id: i32,
    pub shelf_code: String,
    pub area: String,
    pub capacity: i32,
    pub current_count: i32,
    pub remaining: i32,
    pub usage_rate: f64,
}
```

关键点：MySQL 的 `DATETIME` 映射到 `NaiveDateTime`，`NULL` 字段用 `Option<T>`。

## 数据库连接池（sqls.rs）

```rust
use sqlx::MySqlPool;
use dotenvy::dotenv;

pub async fn create_pool() -> Result<MySqlPool, sqlx::Error> {
    dotenv().unwrap();
    let database_url = dotenvy::var("DATABASE_URL").unwrap();
    let pool = MySqlPool::connect(&database_url).await?;

    // 验证连接
    sqlx::query("SELECT 1;").execute(&pool).await?;
    println!("Database connected success.");
    Ok(pool)
}
```

`.env` 文件：

```
DATABASE_URL="mysql://root:mysecretpassword@localhost:3306/express_station"
```

## SQL 操作（sqls.rs）

### 查询全部包裹

```rust
pub async fn query_all_packages(pool: &MySqlPool) -> Result<Vec<Package>, sqlx::Error> {
    let packages = sqlx::query_as::<_, Package>(
        "SELECT * FROM packages ORDER BY package_id"
    )
    .fetch_all(pool)
    .await?;
    Ok(packages)
}
```

`query_as::<_, Package>` 自动将 MySQL 行映射为 `Package` 结构体。

### 包裹入库（事务性操作）

```rust
pub async fn register_package(
    pool: &MySqlPool,
    tracking_no: &str,
    recipient_name: &str,
    recipient_phone: &str,
    shelf_id: i32,
    courier_company: &str,
    pickup_code: &str,
) -> Result<(), sqlx::Error> {
    // 插入包裹
    sqlx::query(
        "INSERT INTO packages (tracking_no, recipient_name,
         recipient_phone, shelf_id, courier_company, status,
         arrival_time, pickup_code)
         VALUES (?, ?, ?, ?, ?, '待取件', NOW(), ?)"
    )
    .bind(tracking_no)
    .bind(recipient_name)
    .bind(recipient_phone)
    .bind(shelf_id)
    .bind(courier_company)
    .bind(pickup_code)
    .execute(pool)
    .await?;

    // 同步更新货架数量
    sqlx::query(
        "UPDATE shelves SET current_count = current_count + 1 WHERE shelf_id = ?"
    )
    .bind(shelf_id)
    .execute(pool)
    .await?;

    Ok(())
}
```

::: tip 参数化查询
sqlx 使用 `?` 占位 + `.bind()` 传参，完全防止 SQL 注入。和 Python 的 pymysql `%s` 同理。
:::

### 取件操作（先查再改）

```rust
pub async fn pickup_package(
    pool: &MySqlPool,
    tracking_no: &str,
) -> Result<Option<Package>, sqlx::Error> {
    // 先查
    let package = sqlx::query_as::<_, Package>(
        "SELECT * FROM packages WHERE tracking_no = ?"
    )
    .bind(tracking_no)
    .fetch_optional(pool)
    .await?;

    if let Some(pkg) = package {
        if pkg.status != "待取件" && pkg.status != "超期" {
            return Ok(None);
        }

        // 更新状态
        sqlx::query(
            "UPDATE packages SET status = '已取件', pickup_time = NOW()
             WHERE tracking_no = ?"
        )
        .bind(tracking_no)
        .execute(pool)
        .await?;

        // 更新货架数量
        if let Some(shelf_id) = pkg.shelf_id {
            sqlx::query(
                "UPDATE shelves SET current_count = current_count - 1
                 WHERE shelf_id = ?"
            )
            .bind(shelf_id)
            .execute(pool)
            .await?;
        }

        let updated = sqlx::query_as::<_, Package>(
            "SELECT * FROM packages WHERE tracking_no = ?"
        )
        .bind(tracking_no)
        .fetch_one(pool)
        .await?;

        Ok(Some(updated))
    } else {
        Ok(None)
    }
}
```

`fetch_optional` 返回 `Option<Package>`——查不到就是 `None`。

### 模糊搜索

```rust
pub async fn search_packages(
    pool: &MySqlPool,
    keyword: &str,
) -> Result<Vec<Package>, sqlx::Error> {
    let pattern = format!("%{keyword}%");
    let packages = sqlx::query_as::<_, Package>(
        "SELECT * FROM packages
         WHERE recipient_name LIKE ? OR tracking_no LIKE ?
         ORDER BY package_id"
    )
    .bind(&pattern)
    .bind(&pattern)
    .fetch_all(pool)
    .await?;
    Ok(packages)
}
```

### 货架统计

```rust
pub async fn shelf_stats(pool: &MySqlPool) -> Result<Vec<ShelfStat>, sqlx::Error> {
    let shelves = sqlx::query_as::<_, Shelf>(
        "SELECT * FROM shelves ORDER BY shelf_id"
    )
    .fetch_all(pool)
    .await?;

    let mut stats = Vec::new();
    for s in shelves {
        let remaining = s.capacity - s.current_count;
        let usage_rate = if s.capacity > 0 {
            (s.current_count as f64 / s.capacity as f64) * 100.0
        } else {
            0.0
        };
        stats.push(ShelfStat {
            shelf_id: s.shelf_id,
            shelf_code: s.shelf_code,
            area: s.area,
            capacity: s.capacity,
            current_count: s.current_count,
            remaining,
            usage_rate,
        });
    }
    Ok(stats)
}
```

衍生字段（remaining、usage_rate）在 Rust 侧计算，SQL 只负责查原始数据。

## 交互层（main.rs）

模式和第 5 讲的假数据版完全相同——while 循环 + match 分发：

```rust
#[tokio::main]
async fn main() -> Result<(), sqlx::Error> {
    let pool = create_pool().await.unwrap();

    loop {
        print!(
            "===== 🏪 校园快递驿站管理系统 =====\n\
             1. 📦 查询所有包裹\n\
             2. 📥 包裹入库\n\
             3. 📤 取件登记\n\
             4. 🔍 搜索包裹\n\
             5. 📊 货架统计\n\
             0. 退出系统\n\
             ================================\n\
             请输入操作编号："
        );
        io::stdout().flush().unwrap();
        let mut input = String::new();
        io::stdin().read_line(&mut input).expect("Failed to read line");

        let choice: i32 = input.split_whitespace()
            .next().and_then(|s| s.parse().ok()).unwrap_or_default();

        match choice {
            1 => query_all_packages_cmd(&pool).await?,
            2 => register_package_cmd(&pool).await?,
            3 => pickup_package_cmd(&pool).await?,
            4 => search_package_cmd(&pool).await?,
            5 => shelf_stats_cmd(&pool).await?,
            0 => return Ok(()),
            _ => println!("Wrong choice!!!"),
        }
    }
}
```

## Docker 部署

### MySQL 容器

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.0
    container_name: express_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: express_station
      MYSQL_USER: station
      MYSQL_PASSWORD: station123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-proot123"]
      interval: 10s
      timeout: 5s
      retries: 5
```

`./sql/init.sql` 在容器首次启动时自动执行，完成建库建表和数据初始化。

### 应用容器（多阶段构建）

```dockerfile
# 第一阶段：构建
FROM rust:latest AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release           # 预下载依赖（利用缓存）
RUN rm -rf src
COPY src ./src
RUN cargo build --release           # 编译真实代码

# 第二阶段：运行
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/db_rust /app/db_rust
CMD ["/app/db_rust"]
```

一键启动：`docker compose up -d`

## 与 Python 版的关键差异

| 维度 | Python (pymysql) | Rust (sqlx) |
|------|-----------------|-------------|
| 连接方式 | `pymysql.connect()` 每次新建 | `MySqlPool` 连接池复用 |
| 参数化 | `%s` 占位 + 元组 | `?` 占位 + `.bind()` |
| 结果映射 | `cursor.fetchall()` 返回元组 | `FromRow` 自动映射为结构体 |
| 编译期检查 | 无（SQL 是字符串） | sqlx 可在编译期校验 SQL 语法 |
| 并发模型 | 同步阻塞 | tokio 异步 + 连接池 |

## 小结

从手敲 SQL → Python 假数据 → Python + 真数据库 → Rust + sqlx，数据库的核心不变：建库建表、增删改查、外键约束、参数化查询。变的只是用什么语言把 SQL 发给 MySQL——本质都是"翻译官"。Rust 版本用编译期检查和连接池，为后续嵌入式项目中的数据库需求打下基础。
