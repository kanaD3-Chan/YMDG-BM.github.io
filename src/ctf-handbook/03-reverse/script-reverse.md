---
title: 脚本语言逆向
order: 7
icon: mdi:script-text-outline
category:
  - CTF
  - 手册
  - Reverse
---

除了 C/C++ 编译的二进制，CTF 中也经常出现 Python 字节码、Lua 脚本等脚本语言的逆向题。

## Python 字节码逆向

Python 源码编译后生成 `.pyc` 文件（字节码），可以反编译回接近原始的 Python 代码。

### 反编译 .pyc 文件

```bash
# 安装反编译工具
pip install uncompyle6    # Python 2/3.8 以下
pip install decompile3    # Python 3.x

# 反编译
uncompyle6 target.pyc > output.py
decompile3 target.pyc > output.py

# 如果只有 .py 文件被打包成可执行文件（PyInstaller）
pip install pyinstxtractor
python pyinstxtractor.py target.exe
# 然后反编译提取出的 .pyc
```

### 手动分析字节码

当反编译工具失败时，用 `dis` 模块查看字节码：

```python
import dis, marshal

# 读取 .pyc 文件
with open('target.pyc', 'rb') as f:
    f.read(16)  # 跳过 magic number 和时间戳
    code = marshal.loads(f.read())

dis.dis(code)
```

输出示例：
```
  2           0 LOAD_CONST               1 (b'secret_key')
              2 STORE_NAME               0 (key)

  3           4 LOAD_NAME                1 (input)
              6 CALL_FUNCTION            0
              8 STORE_NAME               2 (flag)
```

### 常见混淆手段

```python
# 1. 变量名混淆（用 l/I/O/0 等难以区分的字符）
lI1 = lambda lIl: lIl ^ 0x37

# 2. 字符串加密（运行时解密）
exec(compile(zlib.decompress(base64.b64decode(b"...")), '<string>', 'exec'))

# 3. 代码对象替换（修改 .pyc 的字节码）
```

**应对方法**：在关键位置插入 `print()` 语句，或者用 `pdb` 调试器单步执行。

## Lua 脚本逆向

Lua 常用于游戏脚本，CTF 中偶尔出现。

```bash
# 反编译 Lua 字节码
# luadec（Lua 5.1）
luadec target.luac

# unluac（Java 工具，支持多版本）
java -jar unluac.jar target.luac
```

## Java 字节码逆向

```bash
# 反编译 .class 文件
javap -c Target.class    # 查看字节码
javap -p Target.class    # 查看所有成员

# 反编译为 Java 源码
# CFR（推荐）
java -jar cfr.jar Target.class

# Procyon
java -jar procyon.jar Target.class

# 反编译 .jar 文件
java -jar cfr.jar target.jar --outputdir output/
```

**Android APK 逆向**（APK 本质是 ZIP，包含 .dex 文件）：

```bash
# 解包 APK
apktool d target.apk -o output/

# 反编译 .dex 为 Java
d2j-dex2jar target.apk -o target.jar
java -jar cfr.jar target.jar --outputdir output/

# 或者用 jadx（一步到位）
jadx target.apk -d output/
```

## .NET 逆向

```bash
# dnSpy（Windows，图形界面，最好用）
# 直接打开 .exe 或 .dll，自动反编译为 C#

# ILSpy（跨平台）
ilspycmd target.exe -o output/

# dotPeek（JetBrains 出品，免费）
```

## 练手资源

- 攻防世界 Reverse 中有 Python/Java 逆向题
- CTFHub 逆向技能树（脚本逆向部分）
