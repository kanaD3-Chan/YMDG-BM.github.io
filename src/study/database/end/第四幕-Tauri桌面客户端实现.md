---
title: 第四幕 Tauri 桌面客户端实现
order: 4
category:
  - 数据库
---

TUI 客户端解决了"能用"的问题，但终端界面对非技术用户不友好，也没法做富文本渲染。于是额外实现了一个 Tauri 桌面客户端——同一套 Server API，换一个前端。

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 桌面壳 | Tauri 2.x | Rust 驱动的原生窗口，内嵌 WebView |
| 前端框架 | React 19 + Vite 8 | 组件化 UI |
| 样式 | 纯 CSS 自定义属性 | 四主题系统 |
| Markdown | react-markdown + rehype-highlight | GFM 渲染 + 语法高亮 |
| XSS 防护 | rehype-sanitize | HTML 白名单过滤 |
| 构建 | `npx tauri build` | 同时产出 .deb / .rpm / Windows exe |

## 项目结构

```
tauri-client/
├── src/                      前端 React 源码
│   ├── App.jsx               Shell 组件（顶栏+侧边栏+内容区）
│   ├── ThemeContext.jsx       主题状态管理
│   ├── AuthContext.jsx        登录状态管理
│   ├── api.js                HTTP 请求封装
│   ├── index.css             全局样式 + 主题覆盖
│   ├── hljs-themes.css       代码高亮主题（按 data-theme 分组）
│   ├── themes/themes.css     四套 CSS 自定义属性定义
│   ├── components/
│   │   └── Markdown.jsx      Markdown 渲染组件
│   └── pages/
│       ├── Login.jsx         登录/注册
│       ├── Home.jsx          文章列表（分类标签+搜索）
│       ├── Article.jsx       文章详情+评论区
│       ├── Editor.jsx        写/编辑文章（编辑/预览双模式）
│       ├── Members.jsx       成员管理（管理员）
│       └── Profile.jsx       个人中心
└── src-tauri/                Rust 壳
    ├── tauri.conf.json       窗口配置、构建配置
    └── src/lib.rs            入口，注册插件
```

## Tauri 的角色

Tauri 本身在这个项目里很薄——`lib.rs` 只有几行：

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

它的价值在于：用 Rust 提供原生窗口和系统集成，前端代码直接调用 Server API，不需要 Electron 那样打包一个完整的 Node.js 运行时。最终产物体积小得多。

## 四主题系统

主题通过 CSS 自定义属性实现，切换时只改 `<html>` 上的 `data-theme` 属性：

```js
// ThemeContext.jsx
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}, [theme])
```

每个主题在 `themes.css` 里定义一套变量：

```css
[data-theme="apple-light"] {
  --bg-solid: #f5f5f7;
  --bg-card: rgba(255,255,255,0.85);
  --accent: #007aff;
  --font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  --blur: blur(20px) saturate(180%);
  --radius: 12px;
  /* ... */
}

[data-theme="cyberpunk"] {
  --bg-solid: #0a0a0f;
  --accent: #00ffff;
  --font: 'Share Tech Mono', 'Courier New', monospace;
  --blur: none;
  --radius: 2px;
  /* ... */
}
```

四个主题的设计方向：

| 主题 | 风格 | 特征 |
|---|---|---|
| Apple Light | macOS 亮色 | 毛玻璃、大圆角、SF Pro 字体 |
| Apple Dark | macOS 暗色 | 同上，深色背景 |
| Cyberpunk | 赛博朋克 | 黑底青色、等宽字体、扫描线、零圆角 |
| Frutiger Aero | 2000s 玻璃风 | 渐变背景、高饱和玻璃卡片、光泽效果 |

主题特定样式用属性选择器覆盖，不污染全局：

```css
/* Cyberpunk 扫描线效果 */
[data-theme="cyberpunk"] #root::before {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(0,255,255,0.012) 2px, rgba(0,255,255,0.012) 4px
  );
  pointer-events: none;
  z-index: 9999;
}

/* Frutiger Aero 卡片光泽 */
[data-theme="frutiger-aero"] .card::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 45%;
  background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%);
  pointer-events: none;
}
```

## Markdown 渲染与 XSS 防护

文章内容是用户输入的 Markdown，直接渲染存在 XSS 风险。防护分三层：

**第一层：React 虚拟 DOM**。`react-markdown` 不使用 `dangerouslySetInnerHTML`，所有节点通过 React 组件渲染，天然阻断脚本注入。

**第二层：rehype-sanitize 白名单**。允许的 HTML 标签和属性严格限定，只额外放开 `className`（供 highlight.js 注入语法高亮 class）：

```js
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
  },
}

// 插件顺序：先高亮，再净化——顺序反了 className 会被剥掉
rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
```

**第三层：URL 净化**。链接和图片的 `href`/`src` 过滤掉 `javascript:`、`vbscript:`、`data:` 协议：

```js
function safeHref(href) {
  if (!href) return '#'
  const lower = href.trim().toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:')) return '#'
  return href
}
```

## 代码高亮跟随主题

highlight.js 的主题 CSS 是全局的，直接 import 会导致代码块颜色固定不变。解决方案是把所有 `.hljs-*` 规则用 `[data-theme]` 选择器包裹，按主题分组：

```css
/* hljs-themes.css */
[data-theme="apple-light"] .hljs { color: #24292e; background: transparent; }
[data-theme="apple-light"] .hljs-keyword { color: #d73a49; }

[data-theme="cyberpunk"] .hljs { color: #e0f0ff; background: transparent; }
[data-theme="cyberpunk"] .hljs-keyword { color: #ff79c6; }
[data-theme="cyberpunk"] .hljs-title,
[data-theme="cyberpunk"] .hljs-title.function_ { color: #00ffff; }
/* ... */
```

`pre` 的背景色同样用 CSS 变量 `var(--bg-code)` 而不是硬编码，每个主题单独定义这个变量。

## 跨平台编译

Linux 本机直接 `npx tauri build` 产出 `.deb` 和 `.rpm`。

Windows 版本用 `x86_64-pc-windows-gnu` 交叉编译目标，需要 `mingw-w64` 工具链：

```toml
# src-tauri/.cargo/config.toml
[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"
ar     = "x86_64-w64-mingw32-ar"
```

```bash
npx tauri build --target x86_64-pc-windows-gnu
```

产出裸 `.exe`，在目标 Windows 机器上需要预装 WebView2 Runtime（Win11 自带，Win10 需手动安装）。NSIS 安装包需要 `makensis.exe`，Linux 交叉编译环境里没有，跳过。

::: tip
Tauri 的 `src-tauri` 是独立的 Cargo 项目，不能被根 workspace 管理。在根 `Cargo.toml` 里加 `exclude = ["tauri-client/src-tauri"]`，否则 `cargo build --workspace` 和 `tauri build` 会互相干扰。
:::

## 启动方式

```bash
cd ~/db_class_design_rs/tauri-client

# 开发模式（热重载）
npx tauri dev

# 生产构建（Linux）
npx tauri build

# 交叉编译 Windows
npx tauri build --target x86_64-pc-windows-gnu
```
