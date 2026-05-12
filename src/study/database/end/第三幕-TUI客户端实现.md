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
| Markdown 解析 | comrak 0.52 | 解析 Markdown AST |

## 架构概览

```
main.rs          事件循环 + 页面分发
├── app.rs       全局状态 (App struct) + 页面枚举
├── api.rs       HTTP 请求封装
├── ws.rs        WebSocket 连接 + 通知接收
├── pages/
│   ├── login    登录/注册页
│   ├── home     文章列表页
│   ├── article  文章详情 + 评论
│   ├── editor   Markdown 编辑器
│   ├── members  成员管理（管理员）
│   └── profile  个人中心
└── components/
    ├── input    输入框组件
    ├── list     列表组件
    ├── markdown Markdown → ratatui Lines 渲染器
    ├── popup    确认弹窗
    └── toast    通知提示条
```

## 事件循环

ratatui 的标准事件循环模式：

```rust
loop {
    // 接收 WebSocket 通知（非阻塞）
    while let Ok(notif) = ws_rx.try_recv() {
        app.push_notification(notif);
    }

    // 渲染当前页面
    terminal.draw(|f| match &app.page {
        Page::Home    => pages::home::render(f, &app),
        Page::Article => pages::article::render(f, &app),
        // ...
    })?;

    // 等待事件（100ms 超时，保证 WS 通知能及时刷新）
    if event::poll(Duration::from_millis(100))? {
        match event::read()? {
            Event::Key(key)   => handle_key(&mut app, key).await,
            Event::Mouse(m)   => handle_mouse(&mut app, m).await,
            _ => {}
        }
    }
}
```

## Markdown 渲染

comrak 解析 Markdown 为 AST，然后递归遍历节点，转换为 ratatui 的 `Vec<Line<'static>>`：

```rust
pub fn markdown_to_lines(md: &str, width: usize) -> Vec<Line<'static>> {
    let arena = Arena::new();
    let root = parse_document(&arena, md, &Options::default());
    let mut lines = Vec::new();
    render_node(root, &mut lines, width, 0);
    lines
}
```

各节点的渲染策略：

| Markdown 元素 | 渲染方式 |
|---|---|
| `# H1` | Cyan + Bold |
| `## H2` | Yellow + Bold |
| `**bold**` | Bold modifier |
| `*italic*` | Italic modifier |
| `` `code` `` | LightGreen + Black 背景 |
| 代码块 | 每行加 `  ` 缩进，LightGreen 前景 |
| 列表项 | `  • ` 前缀，Yellow |
| 引用块 | `▌ ` 前缀，Gray |
| 分割线 | `─` 重复 |

## 键盘快捷键

| 键 | 场景 | 动作 |
|---|---|---|
| `q` / `Esc` | 全局 | 返回/退出 |
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
| `e` | 文章详情 | 编辑文章 |
| `d` | 文章详情 | 删除文章 |
| `c` | 文章详情 | 发表评论 |
| `r` | 文章详情 | 回复评论 |
| `Ctrl+S` | 编辑器 | 保存文章 |
| `Ctrl+O` | 编辑器 | 切换预览 |
| `Ctrl+←/→` | 编辑器 | 切换分类 |
| `r` | 成员管理 | 切换角色 |

## 鼠标支持

通过 `crossterm::execute!(stdout, EnableMouseCapture)` 开启鼠标捕获：

- **滚轮**：文章列表上下滚动、文章内容翻页
- **左键点击**：列表项选中并进入

## 启动方式

```bash
# Server 需先启动
cargo run -p forum-server &

# 启动 TUI 客户端
cargo run -p forum-client
```
