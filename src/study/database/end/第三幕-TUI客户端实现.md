---
title: 第三幕 TUI 客户端实现
order: 3
category:
  - 数据库
---

## 技术栈

| 组件 | Crate | 说明 |
|---|---|---|
| TUI 框架 | ratatui 0.30 | 终端 UI 渲染 |
| 终端控制 | crossterm 0.29 | 键盘/鼠标事件、原始模式 |
| HTTP 客户端 | reqwest 0.13 | 调用 Server API |
| WebSocket | tokio-tungstenite 0.29 | 接收实时通知 |
| Markdown 渲染 | tui-markdown 0.3 | Markdown → ratatui Text，内置语法高亮 |

## 架构概览

```
main.rs          事件循环 + 页面分发 + 异步 handler
├── app.rs       全局状态 (App struct) + 页面枚举 + 导航
├── api.rs       HTTP 请求封装（reqwest）
├── ws.rs        WebSocket 连接 + 通知接收
├── pages/
│   ├── login    登录/注册页
│   ├── home     文章列表页（左列表+右预览）
│   ├── article  文章详情 + 评论区
│   ├── editor   Markdown 编辑器（编辑/预览双模式）
│   ├── members  成员管理（管理员）
│   └── profile  个人中心
└── components/
    ├── input    输入框组件
    ├── list     列表组件
    ├── markdown Markdown → ratatui Text 渲染
    ├── popup    确认弹窗
    └── toast    通知提示条
```

## 事件循环

ratatui 的标准事件循环模式，100ms 超时保证 WebSocket 通知能及时刷新：

```rust
loop {
    // 接收 WebSocket 通知（非阻塞）
    while let Ok(notif) = ws_rx.try_recv() {
        app.push_notification(notif);
    }

    // 渲染当前页面
    terminal.draw(|f| {
        match &app.page {
            Page::Home    => pages::home::render(f, &app),
            Page::Article(_) => pages::article::render(f, &app),
            // ...
        }
        // 弹窗和 Toast 覆盖在最上层
        if let Some(popup) = &app.popup {
            components::popup::render_popup(f, &popup.title, &popup.message);
        }
    })?;

    // 等待事件（100ms 超时）
    if !event::poll(Duration::from_millis(100))? { continue; }

    match event::read()? {
        Event::Key(key)   => handle_key(&mut app, key).await,
        Event::Mouse(m)   => handle_mouse(&mut app, m).await,
        _ => {}
    }
}
```

## 页面与状态管理

所有 UI 状态集中在 `App` struct，页面通过 `Page` 枚举表示：

```rust
pub enum Page {
    Login,
    Home,
    Article(u32),          // 携带文章 ID
    Editor { article_id: Option<u32> },  // None = 新建，Some = 编辑
    Members,
    Profile,
}
```

导航用 `navigate()` / `go_back()` 管理历史栈（只保留一层），类似浏览器的 back 按钮：

```rust
pub fn navigate(&mut self, page: Page) {
    let old = self.page.clone();
    self.prev_page = Some(old);
    self.page = page;
}

pub fn go_back(&mut self) {
    if let Some(prev) = self.prev_page.take() {
        self.page = prev;
    } else {
        self.page = Page::Home;
    }
}
```

## 页面 → Action → Handler 模式

每个页面的 `handle_key` 函数返回 `Option<XxxAction>` 枚举，而不是直接执行异步操作——因为 ratatui 的渲染闭包不能是 async 的。异步操作统一在 `main.rs` 的 handler 函数里执行：

```rust
// pages/home.rs
pub fn handle_key(app: &mut App, key: KeyEvent) -> Option<HomeAction> {
    match key.code {
        KeyCode::Enter => Some(HomeAction::OpenArticle(app.articles[app.article_selected].id)),
        KeyCode::Char('n') => Some(HomeAction::NewArticle),
        // ...
        _ => None,
    }
}

// main.rs
if let Some(action) = pages::home::handle_key(&mut app, key) {
    handle_home_action(&mut app, action).await;  // 这里才能 .await
}
```

这个模式把"用户意图"（Action）和"副作用执行"（HTTP 请求）分离，页面模块保持纯同步，便于测试。

## Markdown 渲染

使用 `tui-markdown` crate，基于 pulldown-cmark 解析并内置 syntect 语法高亮，直接返回 ratatui `Text` 类型：

```rust
// components/markdown.rs
pub fn render_markdown(md: &str) -> Text<'_> {
    tui_markdown::from_str(md)
}
```

代码块会按语言着色（Rust、Python、SQL、Bash 等），标题、粗体、斜体、引用块都有对应的终端样式。

## 首页布局

```
┌─────────────────────────────────────────────────────────┐
│ SLsec 论坛  KanaD3 [admin]  🔔2                         │
│ [全部]  综合  技术  安全  生活    搜索: _                │
├──────────────────────────────┬──────────────────────────┤
│ 文章列表 (3/12)              │ 预览                     │
│ ▶ SQL注入原理与防御 [security]│ SQL 注入原理与防御       │
│   博丽灵梦 | 👁12 💬4 | 05-14│                          │
│   Rust所有权系统 [tech]      │ 作者: 博丽灵梦  分类: sec│
│   雾雨魔理沙 | 👁8 💬3 | 05-14│ ──────────────────────── │
│   ...                        │ SQL 注入是 Web 安全里最  │
│                              │ 经典的漏洞之一...        │
├──────────────────────────────┴──────────────────────────┤
│ q:退出  Enter:查看  n:写文章  /:搜索  m:成员  Tab:分类  │
└─────────────────────────────────────────────────────────┘
```

## 键盘快捷键

| 键 | 场景 | 动作 |
|---|---|---|
| `q` | 首页 | 退出程序 |
| `Esc` / `q` | 其他页面 | 返回上一页 |
| `j` / `↓` | 列表 | 下移 |
| `k` / `↑` | 列表 | 上移 |
| `g` / `G` | 列表 | 跳首/跳尾 |
| `Enter` | 列表 | 进入/确认 |
| `n` | 首页 | 写新文章 |
| `/` | 首页 | 搜索 |
| `Tab` | 首页 | 切换分类 |
| `m` | 首页 | 成员管理 |
| `p` | 首页 | 个人中心 |
| `N` | 首页 | 通知列表 |
| `r` / `F5` | 首页 | 刷新 |
| `e` | 文章详情 | 编辑文章 |
| `d` | 文章详情 | 删除文章（弹窗确认） |
| `c` | 文章详情 | 发表评论 |
| `r` | 文章详情 | 回复评论 |
| `Tab` | 文章详情 | 切换焦点（内容区/评论区） |
| `Ctrl+S` | 编辑器 | 保存文章 |
| `Ctrl+O` | 编辑器 | 切换预览模式 |
| `Ctrl+←/→` | 编辑器 | 切换分类 |
| `r` | 成员管理 | 切换角色 |

## 鼠标支持

通过 `crossterm::execute!(stdout, EnableMouseCapture)` 开启鼠标捕获：

- **滚轮**：文章列表上下滚动、文章内容翻页
- **左键点击**：列表项选中并进入（按行号计算命中索引）

文章详情页记录内容区和评论区的坐标 `(x, y, w, h)`，每帧更新，用于鼠标点击区域判断：

```rust
// 每帧渲染后更新布局坐标
let (art, cmt) = pages::article::layout_areas(rect);
app.article_area = (art.x, art.y, art.width, art.height);
app.comments_area = (cmt.x, cmt.y, cmt.width, cmt.height);
```

## 启动方式

```bash
# Server 需先启动
cargo run -p forum-server &

# 启动 TUI 客户端
cargo run -p forum-client
```
