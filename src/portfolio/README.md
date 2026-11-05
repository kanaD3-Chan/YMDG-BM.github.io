---
title: 档案主页
portfolio: true
icon: address-card
sidebar: false
toc: false
breadcrumb: false
pageInfo: false
contributors: false
editLink: false
index: false
article: false
description: "KanaDE 的个人技术主页，记录软件工程、AI Agent、网络安全、嵌入式系统与底层技术实践。"
welcome: 👋 你好，我是
name: KanaDE
avatar: /maomao.png
titles:
  - CTFer
  - IoT Engineering
  - PDSU
  - Computer Science
footer: true
---
<!-- more -->

> **Code is cheap. Show me the reasoning.**

一个喜欢拆解复杂系统、研究技术原理，并尝试从零构建东西的人。

我对技术的兴趣不局限于某个具体领域。从 AI Agent 到网络安全，从 Rust 软件工程到嵌入式硬件，再到操作系统与底层系统，我更在意一件事：

**一个系统为什么这样工作？如果从头设计，我会怎么做？**

- **ID**：`kanaDE`
- **方向**：AI Agent Engineering · Cybersecurity · Systems · Embedded
- **常用语言**：Rust / C / Python
- **开发环境**：Arch Linux / Windows
- **当前状态**：持续探索，持续构建。

`I use Arch, btw.`

---

## `$ whoami`

我不太喜欢只停留在调用 API、拼接框架和复现教程的层面。

比起知道某个工具怎么用，我更希望理解它背后的机制；比起完成一个 Demo，我更关注系统的边界条件、错误处理、可维护性和实际运行表现。

我的技术实践大致分为几个方向：

- **AI Agent**：Agent 架构、工具调用、上下文管理、任务执行与验证。
- **Cybersecurity**：CTF、Pwn、漏洞分析、安全教学与竞赛基础设施。
- **Systems Engineering**：Rust、操作系统、底层软件与工程化设计。
- **Embedded Systems**：MCU、外设驱动、异步执行、运动控制与硬件交互。

---

## 🧰 技术方向

| 领域 | 实践内容 |
| --- | --- |
| AI Agent | Agent 架构、工具调用、任务规划、执行验证、模型 API 集成 |
| 软件工程 | Rust、Axum、SQLx、PostgreSQL、Vue 3、Tauri |
| 网络安全 | CTF、Pwn、漏洞分析、逆向分析、竞赛平台 |
| 嵌入式 | STM32、51、外设驱动、DMA、SPI、I²C、UART |
| 系统底层 | C、x86-64、汇编、Bootloader、GDT、IDT |
| AI 实验 | 本地 LLM、模型量化、推理优化、小规模模型训练 |

工具和语言只是实现手段。相比列出一长串关键词，我更愿意展示它们实际解决了什么问题。

---

## 🚩 Projects

这里记录我参与设计、开发和维护的项目。状态以实际完成情况为准。

### 重点项目

#### 01. Mistake Agent v2

<badge color="success">持续开发 · v0.1.0-alpha</badge> <badge>AI Agent</badge> <badge>Rust 2024</badge> <badge>Tauri v2</badge>

**面向中学生的本地智能错题管理与辅助学习桌面 Agent。**

采用 Tauri v2 + Vue 3 桌面端与进程内单二进制独立 Rust Kernel 架构，数据与模型密钥全部保存在本机。

核心架构与特性：

- **单模型统一调度（ADR-0045）**：全面收敛至 DeepSeek `deepseek-flash`（Responses API），利用 thinking 思考链、结构化工具调用与原生多模态 `input_image` 统一承担对话、调度、判分与错题归档，彻底废除多模型拼接的高延迟与不一致性。
- **两段式插件微内核（ADR-0035 / ADR-0036）**：内核插件（storage, memory, compute, model）与业务插件（grading, practice, report, exam, tracking）构建期自动发现与解耦挂载。
- **用户主导会话流（ADR-0044）**：摒弃模型自作主张切换话题的不可控行为，会话控制权完全交还用户；支持消息树分支编辑与跨会话持久化记忆。
- **本地 WASM 运算沙箱**：基于 Pyodide 提供安全代码执行与理科题算式真值对拍验证，系统临时目录流转，全链路审计日志脱敏。
- **演进式工程沉淀**：严格遵循 ADR 规范驱动设计，截至目前已沉淀 **49 项 ADR**。

角色：项目负责人 / Backend / Agent Architecture

GitHub：[kanaD3-Chan/mistake-agent](https://github.com/kanaD3-Chan/mistake-agent)

项目文档：[Mistake Agent Development](https://kanade-chan.top/study/agent-dev)

---

#### 02. Writeup Platform

<badge color="success">已部署 / 持续维护</badge> <badge>Rust</badge> <badge>Vue 3</badge> <badge>Full-stack</badge>

**专为对接 [ret2shell](https://github.com/ret2shell/ret2shell) CTF 平台构建的自托管 Writeup 提交与管理系统。**

后端基于 Rust 多 crate 工作空间（Axum + SQLx + PostgreSQL），前端采用 Vue 3 + Vite + Pinia。

主要功能与工程特性：

- **双数据库解耦架构**：自建独立 PostgreSQL（负责 Writeup 元数据存储与自动化版本迁移）与 ret2shell 数据库（**只读连接**，解析比赛、队伍与管理员鉴权），配合 ret2shell HTTP API 实现基于临时验证码的 JWT 单点登录（SSO）。
- **防御性文件流转与去重**：严格校验 Magic Bytes 文件头（针对 DOCX 深入检查 `[Content_Types].xml`）；基于 SHA-256 哈希进行跨队伍防抄袭与赛事内去重；采用临时文件落盘 + POSIX 原子重命名（Atomic Rename Upsert）保障覆盖写一致性。
- **免下载站内在线预览**：深度集成 PDF.js 与 `docx-preview`，参赛选手与裁判无需下载未知文件即可在站内直接审阅排版。
- **赛事化管理与多语言支持**：原生适配简中/繁中/英/日四国语言；支持赛事置顶直达、训练场（个人）与赛事（战队）权限隔离、RFC 5987 友好文件名批量 ZIP 打包导出。
- **容器化交付**：提供多阶段构建 Dockerfile（Rust 后端 + Vue 前端 + Nginx SPA 路由反代）与 docker-compose 一键生产部署。

技术栈：Rust / Axum / SQLx / PostgreSQL / Vue 3 / Vite / Pinia / Docker

GitHub：[kanaD3-Chan/writeup-platform](https://github.com/kanaD3-Chan/writeup-platform)

---

#### 03. STM32-FOC-MP3 (Haptic Sound Yoke)

<badge color="success">已完成</badge> <badge>Embedded Rust</badge> <badge>FOC</badge> <badge>no_std</badge>

**基于 STM32F407 的触觉拟物化黑胶转盘音频播放系统。**

打破传统按键交互范式，基于 STM32F407ZGT6 与纯 Rust (`no_std` + Embassy 异步执行器) 工具链，实现集电机触觉反馈、高吞吐存储与硬件音频解码于一体的便携式感官控制器。

核心功能与底层设计：

- **FOC 开环正弦旋转控制**：基于 TIM1 三相互补 PWM（20 kHz 边沿对齐, 12V 供电），静音平稳驱动 7 对极无刷直流电机（BLDC）维持黑胶唱片标准的 33.3 RPM 恒定自转。
- **磁编码器堵转感知与搓盘打碟**：AS5600 磁编码器（12-bit 分辨率, 硬件 I²C）5ms 高频采样；50ms 窗口实际角增量连续低于预期 20% 超 400ms 自动切断电机动力并转入打碟模式；**物理转盘旋转 1 整圈 ($2\pi$) 精准等比例映射 30 秒音频快进/快退**，松手 800ms 后平滑恢复播放。
- **VS1053 硬件流控解码**：SPI2 区分控制与数据流，绑定 PA11 DREQ 硬件中断，采用 512 字节环形缓冲搭配 32 字节 DMA 异步分片微包流式供给，解析 WAV 容器 `byte_rate` 保证毫秒级定位无杂音爆音。
- **SDIO 4-bit 总线与上游 Bug 修复**：利用 SDIO 4-bit（24 MHz + DMA2_CH6）高速吞吐；**排查并修复上游 `embedded-sdmmc` 库中 FAT32 目录项大卷簇号截断缺陷**（正确拼接 `(hi << 16) | lo` 完整 32 位簇号），解决大容量卡定位异常。
- **嵌入式离屏图形渲染**：ST7735S 128×160 TFT 彩屏，基于 `embedded-graphics` 实现 `DmaSpiBus` 异步总线适配与 `ProgressBuffer` 离屏渲染机制，彻底消除屏幕刷新撕裂与频闪。

技术栈：Rust / `no_std` / Embassy / STM32F4 / FOC / SDIO / SPI / I²C / DMA / embedded-graphics

Gitee：[STM32-FOC-MP3](https://gitee.com/kanaDE-Chan/stm32-foc-mp3)

---

#### 04. DICK-Project

<badge color="success">已完成</badge> <badge>Embedded C</badge> <badge>8051</badge>

**基于 IAP15W4K61S4 单片机的键盘与显示交互控制终端。**

在资源极度受限的增强型 8051 硬件平台（STC IAP15W4K61S4）上，从底层外设驱动到上层业务逻辑，实现一套工业级人机交互终端系统。

核心设计：

- **PS/2 键盘通信协议栈**：编写硬件中断驱动的 PS/2 双向通信逻辑，实现时钟/数据线精准时序采样、键盘扫描码转换、Shift/Caps Lock 状态管理以及通断码（Make/Break Code）过滤。
- **VFD / LCD 显示子系统**：8 位并行数据总线驱动 VFD（真空荧光屏）与 LCD，内置 95 字符 5×7 点阵 ASCII 点阵生成器与地址映射渲染驱动。
- **分层有限状态机（FSM）**：建立 `SystemState_t` 状态机模型（空闲监听、串口直通显示、键盘打字录入模式切换），配合 UART1 环形中断接收缓冲区，实现无 OS 裸机环境下非阻塞、事件驱动的交互链路。

技术栈：C / 8051 / IAP15W4K61S4 / PS/2 / VFD / UART / GPIO / Keil C51

Gitee：[DICK-Project](https://gitee.com/kanaDE-Chan/DICK-Project)

---

### 其他项目

#### 05. KanaDE_Kernel

<badge color="warning">开发中</badge> <badge>Operating Systems</badge> <badge>x86-64</badge>

从零编写的 x86-64 独立实验性操作系统内核，基于 Limine 引导协议。

已实现模块与核心机制：

- **引导与执行环境**：遵循 Limine 引导协议进入 64 位长模式，配置 CR0/CR4 寄存器开启 FPU 与 SSE 向量指令集支持。
- **基础基础设施**：构建 GDT（全局描述符表与汇编加载器）与 IDT（256 项中断描述符表），支持 CPU 异常捕获与硬件中断现场保护。
- **物理内存管理（PMM）**：解析系统内存图（Memory Map），基于位图（Bitmap）算法实现物理页框（4 KiB Page Frame）的高效追踪、无锁分配与释放。
- **虚拟内存管理（VMM）**：搭建完整 x86-64 架构 4 级页表（PML4 / PDPT / PD / PT）映射机制（`vmm_map_page`），完成高半核虚拟地址空间隔离与 `0xDEADBEEFCAFEBABE` 虚拟地址读写断言测试。
- **裸机图形控制台**：基于 Limine 线性帧缓冲（Framebuffer）与 PSF 点阵字体解析，实现支持颜色、换行与滚动输出的内核格式化控制台（`fb_console`）。

技术栈：C / x86-64 / Assembly / Limine / QEMU

GitHub：[KanaDE_Kernel](https://github.com/YMDG-BM/KanaDE_Kernel)

---

#### 06. JavaFX Music Player

<badge color="success">已完成</badge> <badge>Java 17</badge> <badge>JavaFX</badge>

基于 Java 17 与 JavaFX 17 构建的现代化模块化桌面音乐播放器。

核心设计：

- **模块化架构**：基于 Java Platform Module System（JPMS `module-info.java`）与 Maven 进行工程组织，集成 ControlsFX UI 增强库。
- **MVC 分层设计**：通过 FXML 进行界面解耦，实现主播放视窗（MainWindow）、播放列表管理视窗（MusicListWindow）与关于视窗的多窗口单例及状态同步。
- **媒体流解耦加载**：封装异步文件加载器（`MusicFileLoader`），配合 `MusicPlayer` 核心类实现本地音频解析、播放队列调度与播放状态持久化。

技术栈：Java 17 / JavaFX 17 / FXML / ControlsFX / Maven

Gitee：[java-course-design](https://gitee.com/nachn_admin/java-course-design)

---

## 🔬 Lab & Experiments

除正式项目外，我也会做一些规模较小、偏探索性质的实验。

| 方向 | 内容 |
| --- | --- |
| Local LLM | 本地模型部署、量化、推理性能测试 |
| Constitutional AI | 基于 PyTorch 的小规模模型训练实验，涉及约 77M 参数模型与 4.5M tokens 训练数据 |
| IoT Agent | 探索支持动态 0..Nmax 设备与动作输出的 Agent 架构 |
| SDVX Controller | 自制音游控制器，研究旋钮编码器、阻尼结构与机械设计 |
| Embedded Control | FOC、电机驱动、传感器与 MCU 外设实验 |
| OS Development | 操作系统内核与底层机制学习 |

实验项目不一定都会成为完整产品，但每次实验都应该留下可以复用的知识、代码或结论。

---

## 🧠 Technical Notes

### AI 时代，什么仍然值得学习？

AI 已经能够完成越来越多过去需要人工投入大量时间的工作。

代码实现、逆向分析、测试、实验和迭代的成本都在下降。对于复杂任务，Agent 甚至可以独立完成相当长的执行链。

但这并不意味着理解变得不再重要。

我更倾向于把 AI 看作一个外置大脑：

- 它可以扩展一个人的能力边界。
- 它可以承担重复劳动和复杂执行。
- 它可以帮助验证想法、探索方案、发现盲点。
- 但它不应该成为放弃判断的理由。

**允许自己暂时不懂，但不要放弃理解。**

允许 AI 替你做事，也要保留对问题、过程和结果的判断能力。

> AI makes execution cheap. It makes knowing what to execute more valuable.

### 关于工程

我认为一个项目的价值，不应该只由代码量、技术名词或使用了多少框架决定。

更值得展示的是：

1. 问题是什么？
2. 为什么选择这个方案？
3. 方案有哪些限制和取舍？
4. 如何验证它确实有效？
5. 遇到问题时，如何定位并修复？

**Code is cheap. Show me the reasoning.**

---

## 🧑‍💻 About Me

- **ID**：kanaD3 / KanaDE
- **学校**：PDSU
- **开发环境**：Arch Linux / Windows
- **常用语言**：Rust / C / Python
- **兴趣方向**：AI Agent、网络安全、嵌入式、操作系统、底层系统
- **日常兴趣**：咖啡、硬件折腾、音乐与技术探索

### 一些个人习惯

- 喜欢从原理出发，而不是只记结论。
- 喜欢文档和实际操作，不太喜欢低效会议。
- 代码洁癖：`free()` 之后不置 `NULL` 会被我暗中吐槽。
- 不迷信技术名词，能跑通、能验证、能解释更重要。

---

## 📬 Contact

- QQ：2079169303
- Blog：[KanaDE Notes](https://kanade-chan.top/)
- GitHub：[kanaD3-Chan](https://github.com/kanaD3-Chan)
- Gitee：[kanaDE-Chan](https://gitee.com/kanaDE-Chan)

技术交流、开源协作与友链交换均欢迎。

---

<p align="center">Build things. Understand things. Keep questioning.</p>

<p align="center">© 2026 KanaDE</p>


## 友链
欢迎添加我的友链！如果你想添加我的友链，那么请复制以下内容作为参考：

```yaml
title: 你的 ID
desc: 你的描述
logo: 你的头像/logo
link: 你的博客链接
background: rgba(253, 230, 138, 0.15) # 你想要的背景板颜色
```

然后在本博客的[github仓库](https://github.com/kanaD3-Chan/YMDG-BM.github.io)上发起一个issue或者pr即可。

## 大手子们

```component VPCard
title: Hurkin
desc: 迎着阳光盛大逃亡
logo: https://www.hurkin.top/wp-content/uploads/2025/02/%E5%8F%8B%E5%88%A9%E5%A5%88%E7%BB%AA1.jpg
link: https://www.hurkin.top/
background: rgba(138, 201, 253, 0.15)
```

```component VPCard
title: Mo1u's Blog
desc: 这趟旅行若算开心，亦是无负这一生
logo: https://blog.molulu.top/upload/pZSevJf.jpg
link: https://blog.molulu.top/
background: rgba(138, 253, 188, 0.15)
```
---
```component VPCard
title: Mi1kte4
desc: 接下来就是高光时刻！
logo: https://mi1kte4.top/upload/ec046f11-09f4-4675-bcd4-7b0bd816eb05.png
link: https://mi1kte4.top/
background: rgba(176, 138, 253, 0.15)
```

```component VPCard
title: grand
desc: 萌新兼菜鸡
logo: https://bygeee.github.io/pic/Eau.png
link: https://bygeee.github.io/
background: rgba(253, 138, 230, 0.15)
```
---
```component VPCard
title: L1nk
desc: Live long and pwn
logo: https://li1nk3.github.io/image/icon.jpg
link: https://li1nk3.github.io/
background: rgba(138, 253, 176, 0.15)
```

```component VPCard
title: 2hi5hu
desc: 一起愉快的玩耍吧~
logo: https://2hi5hu.cn/upload/avatar-bakr.jpg
link: https://2hi5hu.cn/
background: rgba(138, 203, 253, 0.15)
```
---
```component VPCard
title: Britney
desc: 似乎没找到简介，，，
logo: https://www.britn3y.top/_astro/1.CHR2qJXG_1PVwUm.webp
link: https://www.britn3y.top/
background: rgba(138, 203, 253, 0.15)
```
```component VPCard
title: joke
desc: joke的小世界
logo: https://simple9656.github.io/img/9.jpg
link: https://simple9656.github.io/
background: rgba(253, 230, 138, 0.15) 
```
---
```component VPCard
title: Ined
desc: KanaDE学姐的小迷弟
logo: portfolio/img/ined.jpg
link: https://boke-murex.vercel.app/
background: rgba(138, 253, 222, 0.15)
```


```component VPCard
title: f00001111
desc: f00001111的学习记录
logo: https://mcsog.top/images/logo.png
link: https://mcsog.top/
background: rgba(253, 230, 138, 0.15)
```
---
```component VPCard
title: Lochad
desc: pwnxnn
logo: http://lochad.top/wp-content/uploads/2026/04/cropped-cropped-HackerTianyi.jpg
link: http://lochad.top/
background: rgba(102, 204, 255, 0.15)
```

<style>
    /* 修复code块溢出导致窄屏渲染异常 */
    code {
        width: 0 !important; /* Don't know why, so don't touch it. */
    }
</style>

<style>
    /* 调优maomao的显示样式 */
    @media (min-width: 959px) {
        .vp-portfolio-avatar {
            display: flex;
            align-items: center;
        }
    }
</style>
