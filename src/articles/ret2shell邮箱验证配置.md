---
title: ret2shell 邮箱验证配置
icon: mdi:email-send
category:
  - 文章
tag:
  - 开发
  - Rust
  - CTF
  - 运维
  - SMTP
---

ret2shell 的用户认证需要邮箱验证和密码重置功能。这里记录了从 SMTP 服务选型、QQ 邮箱直连配置、到前端邮件模板设计的完整过程。

<!-- more -->

## 选型

最初考虑在服务器上搭 Postfix 做 SMTP 中继，内网服务统一走 25 端口投递。但 ret2shell 本身是单机部署，多一层中继没有收益，反而增加维护成本和故障点。最终选择平台直连 QQ 邮箱 SMTP 服务器。

| 方案 | 架构 | 优点 | 缺点 |
|---|---|---|---|
| Postfix 中继 | 平台 → `:25` → Postfix → QQ SMTP | 内网多服务共享 | 多一层进程、认证链路长 |
| 直连 QQ SMTP | 平台 → `smtp.qq.com:587` | 零中间件、配置简单 | 平台自己管认证凭据 |

## QQ 邮箱 SMTP 配置

在 QQ 邮箱设置 → 账户 → POP3/SMTP 服务中开启，获取授权码。

| 字段 | 值 |
|---|---|
| 服务器 | `smtp.qq.com` |
| 端口 | `587`（STARTTLS）|
| 用户名 | `xxxxx@qq.com` |
| 密码 | 授权码（非邮箱密码）|
| 加密 | STARTTLS |

## ret2shell 的邮件架构

ret2shell 的邮件系统分三层：

@startuml
actor 用户
participant "Account API\n(routes/account)" as API
database NATS as Queue
participant "Email Worker\n(worker/email)" as Worker
participant "QQ SMTP\n(smtp.qq.com:587)" as SMTP
actor 邮箱 as Inbox

用户 -> API : 注册 / 忘记密码
API -> API : 生成 token\n存入 Redis cache
API -> Queue : 发布 EmailRequest
API --> 用户 : 200 OK

Queue -> Worker : 消费消息
Worker -> Worker : 检查是否已过期
Worker -> Worker : 检查是否已验证
Worker -> Worker : 从 DB 加载 email config
Worker -> SMTP : lettre + STARTTLS
SMTP --> Worker : 250 OK
Worker -> Queue : double_ack()
SMTP -> Inbox : 投递邮件
@enduml

关键点：

1. **异步解耦** — 注册请求不阻塞在 SMTP 上，投递到 NATS 即返回
2. **防重入** — Worker 检查用户是否已 `Verified`，避免重复发送验证邮件
3. **限频** — `check_email_freq!` 宏限制同邮箱 30 分钟内最多 3 次
4. **过期丢弃** — 超过 1 小时的队列消息直接 `double_ack` 丢弃
5. **重试** — Worker 失败后最多重试 3 次

## 配置结构

`r2s-config` crate 中 `email::Config` 的完整定义：

```rust
pub struct Config {
    pub enabled: bool,                       // 是否启用
    pub host: String,                        // smtp.qq.com
    pub port: u16,                           // 587
    pub sender: String,                      // 发信人名称
    pub sender_address: Option<String>,      // 发信地址（默认同 username）
    pub username: String,                    // SMTP 用户名
    pub password: String,                    // SMTP 授权码
    pub tls: String,                         // "none" / "tls" / "starttls"
    pub verify_email_subject: Option<String>,
    pub verify_email_body: Option<String>,
    pub reset_password_email_subject: Option<String>,
    pub reset_password_email_body: Option<String>,
}
```

`tls` 字段对应的 lettre 传输层选择：

```rust
match config.tls.as_str() {
    "starttls" => AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.host),
    "tls"     => /* TLS Wrapper (SMTPS) */,
    "none"    => /* 明文 */,
    _         => Err(InvalidEmailTlsConfiguration),
}
```

主题和正文优先从数据库 `config` 表读取，`None` 时回落编译期嵌入的默认模板（`include_str!`）。

## 邮件模板

平台使用 **链接验证** 而非验证码。模板中两个占位符：

| 占位符 | 替换为 |
|---|---|
| `%LINK%` | `/account/verify?email=xxx&token=xxx` 完整链接 |
| `%USER%` | 用户 account 名称 |

两套模板保持统一的视觉风格：深色 `#12141a` 头部 + 彩色 SLsec CTF Shell Logo + 白色正文区。区别在于验证按钮为蓝色 `#0078D6`，重置按钮为红色 `#f83030`。

::: details 验证邮件模板
```html
<!-- 验证按钮 -->
<a href="%LINK%" style="background-color:#0078D6;">
  &gt;_ 验证邮箱
</a>

<!-- 校园网提示 -->
<p>⚠ 提示：点击链接前请确保已接入校园网</p>
```
:::

::: details 密码重置模板
```html
<!-- 重置按钮 -->
<a href="%LINK%" style="background-color:#f83030;">
  &gt;_ 重置密码
</a>

<!-- 校园网提示 -->
<p>⚠ 提示：点击链接前请确保已接入校园网</p>
```
:::

模板中的校园网提示用黄色警告条（`#fff8e1` 背景 + `#ff9800` 左边框），放在 CTA 按钮上方，提醒内网部署场景下需要接入校园网才能打开链接。

## 配置效果

最终用户在平台后台填入以下字段即可启用邮件功能：

| 平台字段 | 值 |
|---|---|
| 启用邮件 | ✓ |
| 加密类型 | `STARTTLS` |
| 服务器地址 | `smtp.qq.com` |
| 端口 | `587` |
| 发信人名称 | `SLsec CTF Shell` |
| 发信地址 | `xxxxx@qq.com` |
| SMTP 用户名 | `xxxxx@qq.com` |
| SMTP 密码 | 授权码 |
| 验证邮件标题 | `SLsec CTF Shell 用户验证邮件` |
| 重置密码标题 | `SLsec CTF Shell 用户密码重置邮件` |

正文使用平台默认模板即可（编译期嵌入），也可通过数据库覆写。

## 踩坑

- **授权码不是邮箱密码** — QQ 邮箱需要在设置中单独开启 SMTP 并生成授权码，密码字段必须填授权码
- **TLS 级别** — 用 587 端口选 `starttls`，不要选 `tls`（那是 465 SMTPS 的 Wrapper 模式）
- **lettre TLS 参数** — `TlsParameters::builder(host).build()` 在 lettre 0.7+ 中会走系统根证书，Arch Linux 下 `ca-certificates` 包必须安装
- **k3s 网络** — 如果 ret2shell 跑在 k8s Pod 里，Pod 能直接出公网访问 `smtp.qq.com`，无需配置 NetworkPolicy
- **字体** — 邮件客户端不支持 web font，邮箱模板字体栈要写死 `JetBrains Mono, Menlo, PingFang SC, Microsoft YaHei, sans-serif` 降级链
