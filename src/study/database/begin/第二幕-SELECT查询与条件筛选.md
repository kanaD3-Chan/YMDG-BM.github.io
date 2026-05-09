---
title: 第二幕：SELECT 查询与条件筛选
order: 2
category:
  - 数据库
---

INSERT 是往里存，SELECT 是往外拿。真实系统中 80-90% 的 SQL 都是 SELECT——刷列表、搜索、查详情，背后全是它。

<!-- more -->

## SELECT 完整语法

```sql
SELECT   列名或表达式          -- 选哪些列
FROM     表名                 -- 从哪张表取
WHERE    过滤条件              -- 筛选哪些行
ORDER BY 排序规则              -- 结果怎么排
LIMIT    数量                 -- 只要前几条
```

## 执行顺序（重要！）

你写的顺序和数据库执行的顺序**完全不同**：

```
你写的顺序：SELECT → FROM → WHERE → ORDER BY → LIMIT
执行的顺序：FROM → WHERE → SELECT → ORDER BY → LIMIT
              ①      ②       ③        ④        ⑤
```

助记：F → W → S → O → L（"服务生，上来"）

### 这直接决定了一条常见报错

```sql
-- ❌ 报错！Unknown column '设备状态'
SELECT device_name, status AS 设备状态
FROM devices
WHERE 设备状态 = '在线';

-- ✅ WHERE 里用原始列名
SELECT device_name, status AS 设备状态
FROM devices
WHERE status = '在线';

-- ✅ ORDER BY 里可以用别名（它在 SELECT 之后执行）
SELECT device_name, status AS 设备状态
FROM devices
ORDER BY 设备状态;
```

| 在哪里用别名 | 能用吗 | 原因 |
|:---:|:---:|------|
| WHERE 里 | ❌ | WHERE 在 SELECT 之前执行，别名还没创建 |
| ORDER BY 里 | ✅ | ORDER BY 在 SELECT 之后执行 |

## WHERE 条件筛选

### 比较运算符

| 运算符 | 含义 |
|:---:|------|
| `=` | 等于 |
| `!=` 或 `<>` | 不等于 |
| `>` / `<` | 大于 / 小于 |
| `>=` / `<=` | 大于等于 / 小于等于 |
| `BETWEEN ... AND ...` | 闭区间 |
| `IN (...)` | 在集合中 |
| `IS NULL` / `IS NOT NULL` | 判空 |
| `LIKE` | 模糊匹配 |

### NULL：最大的坑

NULL 不是 0，不是空字符串，不是 false。NULL 的含义是"未知"。

```sql
-- 无论用 >、<=、=、!=，NULL 参与比较的结果都是 unknown，都被过滤掉
NULL = NULL     → unknown（不是 true！）
NULL != NULL    → unknown
NULL > 0        → unknown

-- ✅ 正确处理 NULL
WHERE last_online_time IS NULL
WHERE last_online_time IS NOT NULL
SELECT COALESCE(last_online_time, '从未上线') FROM devices;
```

> 如果你的查询结果"莫名其妙少了几行"，先检查是不是有 NULL 在搞鬼。

### AND / OR 优先级陷阱

AND 优先级高于 OR，就像乘法优先于加法。**有 OR 的时候，永远加括号。**

```sql
-- ❌ 你以为：(在线 OR 离线) AND 温湿度传感器
-- 实际执行：在线 OR (离线 AND 温湿度传感器)
WHERE status = '在线' OR status = '离线' AND device_type = '温湿度传感器'

-- ✅ 正确
WHERE (status = '在线' OR status = '离线') AND device_type = '温湿度传感器'
```

### LIKE 模糊匹配

| 通配符 | 含义 |
|:---:|------|
| `%` | 任意数量的任意字符 |
| `_` | 恰好 1 个任意字符 |

```sql
WHERE device_name LIKE '%传感器%'    -- 包含"传感器"
WHERE device_code LIKE 'DEV00%'      -- 以 DEV00 开头
WHERE device_code LIKE 'DEV___'      -- DEV + 3 个字符
```

::: warning LIKE 性能
前缀匹配（`'DEV00%'`）可以使用索引。前面带 `%`（`'%传感器%'`）必须全表扫描。数据量小时无所谓，千万行时差别很大。
:::

## ORDER BY 排序

```sql
ORDER BY threshold_value ASC         -- 升序（默认）
ORDER BY threshold_value DESC        -- 降序
ORDER BY status ASC, threshold_value DESC  -- 多列排序
```

未排序的结果顺序是不确定的。需要确定顺序必须用 ORDER BY。

## LIMIT 分页

```sql
LIMIT 3              -- 只要前 3 条
LIMIT 3 OFFSET 2     -- 跳过前 2 条，取 3 条
LIMIT 2, 3           -- 等价写法
```

**分页公式**：第 N 页每页 M 条 → `LIMIT M OFFSET (N-1)*M`

```sql
-- 第 1 页
SELECT * FROM products ORDER BY sales DESC LIMIT 20 OFFSET 0;
-- 第 3 页
SELECT * FROM products ORDER BY sales DESC LIMIT 20 OFFSET 40;
```

## 常用函数

| 类别 | 函数 | 示例 |
|------|------|------|
| 拼接 | `CONCAT(a, b)` | `CONCAT('设备[', name, ']')` |
| 空值替换 | `COALESCE(a, b)` | `COALESCE(time, '从未上线')` |
| 日期差 | `DATEDIFF(date1, date2)` | `DATEDIFF(NOW(), arrival_time)` |
| 当前时间 | `NOW()` | 插入/更新时自动填时间 |
| 去重 | `DISTINCT col` | `SELECT DISTINCT device_type FROM devices` |

## SELECT * 的问题

学习阶段用 `SELECT *` 看数据没问题。但项目代码中必须写明列名：

- 浪费带宽（你可能只需要 3 列）
- 暴露敏感信息（表里有密码字段时）
- 以后加列会导致返回结果变化

## 小结

| 知识点 | 要记住的 |
|--------|---------|
| 执行顺序 | FROM → WHERE → SELECT → ORDER BY → LIMIT |
| NULL | 只能用 IS NULL / IS NOT NULL 判断 |
| AND/OR | 有 OR 就加括号 |
| LIKE | `%` 任意字符，`_` 一个字符 |
| 分页 | 第 P 页 = `LIMIT S OFFSET (P-1)*S` |
