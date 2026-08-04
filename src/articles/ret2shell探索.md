---
title: ret2shell探索随笔记
index: true
icon: codicon:note
category:
  - CTF
  - 碎碎念
tag:
  - CTF
  - 踩坑
---
最近Reverier师傅的回归终端开源了，于是立刻响应，把平台部署了下来供小灯们使用。

平台有专门的部署二进制文件ret2boot，部署非常方便。但是过程中我踩了些坑，这里及时记录一下，以免以后再次遇到。

首先是联网问题。由于github、docker源、k3s源等都在外网，不太好连接，这里我用了warp-cli来进行代理，过滤掉了内网以便内网远程管理服务器。

其次是一个报错问题，经排查似乎是部署程序的bug。我的解决方法是：手动安装github-cli，然后手动登录github账号，再运行部署程序。

之后是一个本地容器镜像站的问题，这个还没有解决。缓解方案是：把题目容器保存成tar包，然后传上去。

2026.5.15 更新

最近给 ret2shell 配套写了一个独立的 Writeup 提交平台（Rust + axum + Vue3），踩了不少坑，记录如下。

### jsonwebtoken 与 rustls CryptoProvider 冲突

`jsonwebtoken` 默认 feature 是 `aws_lc_rs`，而 `reqwest` 默认拉的是 `rustls`，两者都会尝试注册进程级 CryptoProvider，启动时直接 panic：

```
Could not automatically determine the process-level CryptoProvider
```

试过手动调 `aws_lc_rs::default_provider().install_default()`，也试过统一 feature，都没解决。最终直接删掉 `jsonwebtoken`，用 `hmac` + `sha2` + `base64` 手写 HS256 验签，反而更干净。

### musl 静态二进制连 PostgreSQL 报 EOF

用 `x86_64-unknown-linux-musl` 编译后，连接 PostgreSQL 时报：

```
expected to read 5 bytes, got 0 bytes at EOF
```

原因是 musl 下 sqlx 默认会尝试 TLS 握手，但静态二进制没有系统 CA 证书。显式关掉就好：

```rust
use sqlx::postgres::{PgConnectOptions, PgSslMode};
use std::str::FromStr;

let opts = PgConnectOptions::from_str(dsn)?.ssl_mode(PgSslMode::Disable);
let pool = PgPool::connect_with(opts).await?;
```

### docker cp 之后 docker restart 会覆盖

用 `docker cp` 替换容器内二进制后，如果用 `docker restart`，容器会从镜像重新启动，`cp` 进去的文件就没了。

正确姿势：

```bash
docker stop <container>
docker cp ./new-binary <container>:/usr/local/bin/writeup-server
docker start <container>
```

### 中文文件名下载乱码

浏览器下载时文件名乱码，原因是 `Content-Disposition` 没有用 RFC 5987 编码。正确写法：

```
Content-Disposition: attachment; filename="xxx.pdf"; filename*=UTF-8''%E4%B8%AD%E6%96%87.pdf
```

Rust 端手动 percent-encode：

```rust
let encoded: String = filename.bytes().flat_map(|b| {
    if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
        vec![b as char]
    } else {
        format!("%{:02X}", b).chars().collect()
    }
}).collect();
```

前端 fetch 下载时也要手动解析这个头，axios 的 `responseType: 'blob'` 拿不到 `Content-Disposition`，要用原生 `fetch`。

### JWT payload 中文 nickname 解码乱码

前端直接 `atob(payload)` 再 `JSON.parse` 会乱码，因为 `atob` 返回的是 Latin-1 字节串。正确做法：

```typescript
const decoded = decodeURIComponent(
  atob(b64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
)
```

### 谷歌字体 CDN 在大陆访问慢

直接引用 `fonts.googleapis.com` 在大陆基本不可用。解决方案是把字体文件下载到本地，放进 `public/fonts/`，再用本地路径引用。

下载时注意：loli.net 等镜像站会根据 User-Agent 返回不同格式，默认 UA 给 `.ttf`，Chrome UA 才给 `.woff2`。下载 CSS 和字体文件要用同一个 UA，否则 CSS 里的 URL 和实际下载的文件对不上。