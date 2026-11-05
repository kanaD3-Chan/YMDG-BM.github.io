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

# 👋 你好，我是 KanaDE

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

<badge color="success">持续开发</badge> <badge>AI Agent</badge> <badge>Rust</badge>

**一个以本地执行内核为核心的智能学习辅助系统。**

- 基于 Tauri 构建桌面应用。
- 使用自定义 Rust Kernel 承担核心执行逻辑。
- 集成 DeepSeek Responses API 与 SiliconFlow Qwen3-VL。
- 使用 Pyodide 提供代码验证能力。
- 通过 ADR 记录架构决策，目前已有 34 项 ADR。

**关注重点：** Agent 不只是一个聊天界面。它需要理解任务、调用工具、执行操作，并能够检查自己的结果。

角色：项目负责人 / Backend / Agent Architecture

GitHub：[kanaD3-Chan/mistake-agent](https://github.com/kanaD3-Chan/mistake-agent)

项目文档：[Mistake Agent Development](https://kanade-chan.top/study/agent-dev)

---

#### 02. Writeup Platform

<badge color="success">已部署 / 持续维护</badge> <badge>Full-stack</badge> <badge>Rust</badge>

**面向 CTF 学习与竞赛的 Writeup 管理平台。**

后端采用 Rust Axum、SQLx 与 PostgreSQL，前端采用 Vue 3、Vite 和 Pinia。

主要功能：

- 对接既有 ret2shell 环境，实现 JWT SSO 身份认证。
- 支持 PDF、DOCX 等 Writeup 文件上传。
- 支持多语言内容管理。
- 使用独立后端处理平台业务与数据访问。

技术栈：Rust / Axum / SQLx / PostgreSQL / Vue 3 / Vite / Pinia

这里的重点是围绕现有基础设施构建配套的学习成果管理系统。

---

#### 03. STM32-FOC-MP3

<badge color="success">已完成</badge> <badge>Embedded Rust</badge> <badge>FOC</badge>

**基于 STM32F407 的拟物黑胶 WAV 音乐播放器。**

一个把音频播放和实体交互结合起来的嵌入式项目。

项目采用 STM32F407ZGT6，使用 Rust `no_std` 与 Embassy 异步执行器构建底层软件。

核心功能：

- 使用 FOC 开环正弦控制驱动无刷电机，使实体转盘以约 33.3 RPM 旋转。
- 使用 AS5600 磁编码器检测转盘角度，实现人为触摸检测与搓盘交互。
- 通过 VS1053 硬件音频解码芯片完成 WAV 音频流式播放。
- 使用 SDIO 4-bit 总线与 FAT32 文件系统读取存储卡中的音乐。
- 使用 ST7735S TFT 彩屏和 `embedded-graphics` 实现界面显示。
- 使用 DMA 和 Embassy 异步任务处理外设通信。

**一个值得单独记录的工程问题：**

在 SD 卡文件系统适配过程中，发现并修复了上游 `embedded-sdmmc` 中 FAT32 目录项高位簇号未正确拼接的问题，并将修改后的依赖纳入项目。

这类问题往往不会在小容量测试卡上暴露，却可能影响大容量存储设备上的文件定位。

技术栈：Rust / `no_std` / Embassy / STM32F4 / FOC / SDIO / SPI / I²C / DMA

Gitee：[STM32-FOC-MP3](https://gitee.com/kanaDE-Chan/stm32-foc-mp3)

---

#### 04. DICK-Project

<badge color="success">已完成</badge> <badge>Embedded C</badge> <badge>8051</badge>

**基于 IAP15W4K61S4 的键盘与显示交互终端。**

从 MCU 外设驱动到上层状态管理，实现一套具有键盘输入、显示和串口交互能力的硬件终端。

主要功能：

- PS/2 键盘通信协议解析。
- 键盘状态管理，包括 Shift、Caps Lock 与 Break Code。
- VFD / LCD 显示驱动与字符渲染。
- UART 串口通信及中断接收。
- 基于状态机的输入处理与显示逻辑。

技术栈：C / 8051 / IAP15W4K61S4 / PS/2 / UART / GPIO

Gitee：[DICK-Project](https://gitee.com/kanaDE-Chan/DICK-Project)

---

### 其他项目

#### 05. KanaDE_Kernel

<badge color="warning">开发中</badge> <badge>Operating Systems</badge>

从零开始编写的 x86-64 实验性操作系统内核。

目前涉及 Bootloader、GDT、IDT 等基础设施，后续继续探索内存管理、中断处理和进程调度。

技术栈：C / x86-64 / Assembly

GitHub：[KanaDE_Kernel](https://github.com/YMDG-BM/KanaDE_Kernel)

---

#### 06. JavaFX Music Player

<badge color="success">已完成</badge> <badge>Java</badge>

基于 JavaFX 的桌面音乐播放器，实现本地音乐管理、播放列表与基础播放交互。

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

<text align="center">Build things. Understand things. Keep questioning.</text>

<text align="center">© 2026 KanaDE</text>


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

    .vp-portfolio-avatar img {
    }
</style>
