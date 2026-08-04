---
title: Rust / Go 逆向
order: 10
icon: mdi:language-rust
category:
  - CTF
  - 手册
  - Reverse
---

Rust 和 Go 越来越常见，CTF 里这两种语言编译的二进制也多了起来。它们和 C/C++ 二进制在结构上有很大不同，理解这些差异是逆向的前提。

## Rust 二进制特征

### 编译特点

Rust 编译时默认**静态链接标准库**，并且会连带一些运行时（如 `panic` 处理、内存分配器）一起编译进去。这导致 Rust 二进制通常比等效 C 代码大。

### 符号表特征

Rust 对函数名做了**符号修饰（name mangling）**，格式为 `_RNvCskd5q1L39s8N_3std...` 形式的 `Rust ABI` 符号：

```
_RNvCskd5q1L39s8N_3std2io4stdio6stdout   # std::io::stdio::stdout
```

IDA 和 Ghidra 的较新版本能自动识别 Rust 符号并去修饰（demangle）。去修饰后可以看到类似 `example::check_flag::hdeadbeef12345678` 的函数名，`check_flag` 就是用户自定义函数。

### 关键特征

- **`str::as_ptr()` / `str::len()` 分离传递**：Rust 的字符串作为 `(ptr, len)` 元组传递，逆向时如果看到函数接收两个关联的参数（指针 + 长度），很可能就是 Rust 代码
- **`Option` / `Result` 枚举**：Rust 用枚举表示可选/可失败值，在汇编层表现为额外的状态标记位
- **胖指针（fat pointer）**：指向 trait 对象的指针在内存中占 16 字节（数据指针 + vtable 指针）
- **`panic` 相关符号**：`panic!` 宏会生成 `_RNvNtNtCs...3pani...` 等展开处理函数
- **`Drop` 析构函数**：Rust 会自动插入析构调用，形如 `_RNvNtNtCs...4drop...`

### Rust 逆向工具

```bash
# 查看 Rust 二进制中的函数列表
nm -C target/release/challenge       # -C 开启 demangle
objdump -t target/release/challenge

# 搜索特定用户函数
strings target/release/challenge | grep "::"

# IDA Pro 8.x+ 内置 Rust 支持
# Ghidra 需要安装 Rust 插件

# 重命名所有函数（在 IDA/Ghidra 中 Demangle 后）
# 快捷键：选中所有 Rust 符号 → 右键 → Demangle
```

## Go 二进制特征

### 编译特点

Go 编译器默认**静态链接**，且包含整个 Go 运行时（goroutine 调度器、GC、`fmt` 等标准库）。一个简单的 `Hello World` 编译后通常在 1.5MB 以上。

Go 不支持 DLL 动态链接，所有依赖全部编译进一个二进制。

### 符号表特征

Go 的符号名没有被 mangling 破坏——函数名清晰可见：

```
main.checkFlag              # main 包里的 checkFlag 函数
main.main                   # 程序入口
main.init                   # 包初始化函数
fmt.Println                 # fmt 包里的 Println
crypto/sha256.Sum256        # 标准库函数路径可见
```

这也是 Go 逆向比 Rust 容易的一个原因——符号名直接暴露了功能。

::: warning
Go 可以用 `-ldflags="-s -w"` 去除符号/调试信息、用 `-trimpath` 去除编译路径（Go 1.13+），但 CTF 题通常保留。如果符号被 strip，需要用 `go tool objdump` 或动态调试分析。
:::

### 关键特征：goroutine 前导码

这是 Go 二进制最容易识别的特征——**每个函数开头都有一个栈检查前导码**：

```asm
.text:000000000048F800 main_checkFlag proc near
  mov     r12, rsp             ; 保存栈指针
  sub     rsp, 0x60            ; 分配栈帧
  mov     [rsp+0x58], r12      ; 保存到栈上
  cmp     rsp, [r14+0x10]      ; 检查栈是否足够 (与 goroutine 栈比较)
  jbe     slow_path            ; 不够则走慢路径扩栈
  ; ... 函数主体 ...
```

这个 `cmp rsp, [r14+0x10]` 是 Go 的独特标志——`r14` 指向当前的 goroutine 结构体。

### 字符串处理

Go 的字符串是 `(ptr, len)` **双字段结构**，在源码中是 `reflect.StringHeader`：

```go
type StringHeader struct {
    Data uintptr  // 字符串数据指针
    Len  int      // 字符串长度
}
```

在汇编层，传递字符串时经常出现**两个连续的参数**（指针 + 长度）。和 Rust 类似，但 Go 的调用约定更统一。

### 调用约定

Go 使用自己的调用约定，不同于 C ABI：

- **参数通过栈传递**（从 Go 1.17 起部分寄存器传递，但和 x86-64 ABI 不同）
- `rax` 和 `rbx` 等通用寄存器的含义可能和预期不同
- 返回值也通过栈传递

IDA 和 Ghidra 对 Go 的支持有限，反编译结果可能不准确。
建议直接用 **GDB** 或 **go tool** 辅助分析。

### Go 逆向工具

```bash
# 1. 查看 Go 版本（帮助选择匹配的 IDA 插件）
strings challenge | grep "^go1\\."   # 输出如 "go1.21.5"

# 2. 查看函数列表
go tool nm challenge | grep main\.   # 只看 main 包的函数

# 3. 字符串搜索（Go 的字符串在 .rodata 中连续排列）
strings challenge | grep -E "^[A-Za-z]{4,}$"

# 4. IDA Pro 需要安装 Go 插件（Go_Reversing_Helper）
# 5. Ghidra 对 Go 1.17+ 支持较弱，建议用 GDB 动态调试

# 6. GDB 调试 Go 程序
gdb challenge
(gdb) break main.checkFlag
(gdb) run
(gdb) info args         # 查看函数参数
```

## Rust vs Go 逆向对照

| 特征 | Rust | Go |
|------|------|----|
| 二进制大小 | 中等（静态链标准库） | 较大（含完整运行时） |
| 符号修饰 | 强 mangling（需要 demangle） | 几乎无 mangling |
| 标准库识别难度 | 较难（泛型展开后符号膨胀） | 较易（函数名即文档） |
| 字符串结构 | `(ptr, len)` 胖指针 | `(ptr, len)` 双字段 |
| 调用约定 | 同 C ABI（通过 Rust ABI 可调用 C） | 自定义 Go ABI |
| 常见逆向工具 | IDA 8.x (内置 Rust 支持) | IDA + Go plugin / GDB |
| 栈保护 | 默认无栈检查前导码 | 每个函数都有栈扩检查 |
| 编译时间标识 | `rustc` / `RUST_VERSION` 在 .comment 段 | `go1.xx` 版本字符串在 .go.buildinfo |

## 实战技巧

### 1. 快速定位用户代码

在大量标准库代码中找到用户自定义的函数：

**Rust**：查看以 crate 名为前缀的去修饰符号，或搜索 `main::`、`challenge::` 等关键字
**Go**：搜索 `main.` （注意点号，Go 用点分隔包名和函数名）

### 2. 字符串交叉引用

Rust 和 Go 的字符串通常在 `.rodata` 段中。找到可疑字符串后，跳转到它的交叉引用（xref）就能定位使用它的函数。

### 3. 忽略运行时/标准库代码

- Rust 的 `alloc`、`core`、`std` 开头的函数是标准库，一般不是关键逻辑
- Go 的 `runtime.`、`fmt.`、`internal/` 开头的函数是运行时或标准库，避开它们

---

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [Rust 逆向](http://172.16.173.140/training/11?challenge=64) — Rust 编译的程序，符号被 demangle 后分析逻辑
- [Go 逆向](http://172.16.173.140/training/11?challenge=65) — Go 编译的程序，Go 运行时特征明显，找到加密函数还原 flag

---

参考：Rust 逆向官方文档 `docs.rs/rustc-demangle`、Go 官方命令 `go tool nm`。
