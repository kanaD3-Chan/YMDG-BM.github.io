---
title: Android 逆向入门
order: 8
icon: mdi:android
category:
  - CTF
  - 手册
  - 逆向工程
---

Android 逆向在 CTF 中越来越常见，主要目标是 APK 文件。核心工具是 jadx，配合 frida 做动态分析。

## APK 结构

```
app.apk（本质是 ZIP）
├── AndroidManifest.xml   # 应用配置（权限、组件）
├── classes.dex           # Java/Kotlin 字节码
├── lib/                  # 原生 .so 库（ARM/x86）
├── assets/               # 静态资源（可能藏 flag）
└── res/                  # 布局、图片等资源
```

## 静态分析

### jadx 反编译

```bash
# 安装
sudo pacman -S jadx   # Arch
# 或下载 jadx-gui

# 命令行反编译
jadx -d output/ app.apk

# 图形界面（推荐）
jadx-gui app.apk
```

jadx-gui 使用技巧：
- `Ctrl+F` 全局搜索字符串（搜 "flag"、"CTF"、"password"）
- 右键 → Find Usage 追踪函数调用
- Navigation → Class Search 快速定位类

### 提取 DEX 手动分析

```bash
# 解压 APK
unzip app.apk -d apk_out/

# 查看 DEX 文件
ls apk_out/*.dex

# 用 dex2jar 转成 jar
d2j-dex2jar classes.dex -o classes.jar
# 再用 jd-gui 或 jadx 打开 jar
```

### 分析 AndroidManifest.xml

```bash
# APK 中的 manifest 是二进制格式，用 apktool 解码
apktool d app.apk -o decoded/
cat decoded/AndroidManifest.xml
```

关注点：
- `android:exported="true"` 的 Activity/Service（可能被外部调用）
- 自定义权限
- `android:debuggable="true"`（可以 attach 调试器）

## 动态分析：Frida

Frida 是一个动态插桩框架，可以在运行时 hook Java 方法、修改返回值。

### 环境搭建

```bash
# 安装 frida 工具
pip install frida-tools

# 下载 frida-server（与 frida 版本一致）
# https://github.com/frida/frida/releases
# 选 frida-server-xx.x.x-android-arm64.xz

# 推送到设备（需要 root 或模拟器）
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
adb shell /data/local/tmp/frida-server &
```

### Hook Java 方法

```javascript
// hook_check.js
Java.perform(function() {
    // Hook 某个类的方法
    var MainActivity = Java.use("com.example.app.MainActivity");

    // 修改 checkFlag 方法的返回值
    MainActivity.checkFlag.implementation = function(input) {
        console.log("[*] checkFlag called with: " + input);
        var result = this.checkFlag(input);  // 调用原方法
        console.log("[*] Original result: " + result);
        return true;  // 强制返回 true
    };

    // Hook 构造函数
    MainActivity.$init.implementation = function() {
        console.log("[*] MainActivity created");
        this.$init();
    };
});
```

```bash
# 运行 hook 脚本
frida -U -f com.example.app -l hook_check.js --no-pause
# -U: USB 设备
# -f: 启动应用（spawn 模式）
```

### 枚举所有类和方法

```javascript
// 列出所有已加载的类（搜索关键词）
Java.perform(function() {
    Java.enumerateLoadedClasses({
        onMatch: function(name) {
            if (name.includes("flag") || name.includes("Flag")) {
                console.log(name);
            }
        },
        onComplete: function() {}
    });
});
```

### 主动调用方法

```javascript
Java.perform(function() {
    // 获取类实例并调用方法
    Java.choose("com.example.app.CryptoUtil", {
        onMatch: function(instance) {
            var result = instance.decrypt("encrypted_string");
            console.log("Decrypted: " + result);
        },
        onComplete: function() {}
    });
});
```

## 原生库分析（.so 文件）

当关键逻辑在 C/C++ 原生库中时：

```bash
# 提取 .so 文件
unzip app.apk lib/arm64-v8a/libnative.so

# 用 IDA Pro 或 Ghidra 分析
# 注意：ARM64 架构，函数命名规则：
# Java_包名_类名_方法名
# 例：Java_com_example_app_MainActivity_checkFlag
```

常见模式：
- `JNI_OnLoad`：库加载时执行，可能有初始化逻辑
- `Java_*` 函数：被 Java 层调用的原生方法

## CTF 常见题型

### 题型1：字符串比较

```
特征：输入 flag，程序判断对错
方法：
1. jadx 搜索 "flag"、"correct"、"wrong"
2. 找到比较逻辑，直接读出 flag 或逆向算法
```

### 题型2：加密验证

```
特征：flag 经过加密后与硬编码值比较
方法：
1. 找到加密函数
2. 用 frida hook 加密函数，输入已知值观察输出
3. 或直接逆向加密算法，写解密脚本
```

### 题型3：动态加载

```
特征：关键代码在运行时从 assets 或网络加载
方法：
1. 找到 DexClassLoader 调用
2. 提取加载的 dex 文件（可能加密，需先解密）
3. 分析解密后的 dex
```

## 工具速查

```bash
jadx-gui app.apk          # 反编译查看 Java 代码
apktool d app.apk         # 解码资源和 smali
adb logcat | grep flag    # 查看运行日志
frida-ps -U               # 列出设备上运行的进程
objection -g com.xxx -s   # 基于 frida 的交互式分析工具
```

## 练手资源

- [OWASP UnCrackable Apps](https://github.com/OWASP/owasp-mastg/tree/master/Crackmes) — 专为逆向练习设计的 APK
- CTFHub 逆向 Android 系列
- 攻防世界 Android 题目
