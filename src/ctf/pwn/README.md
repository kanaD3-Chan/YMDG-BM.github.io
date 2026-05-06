---
title: 二进制安全
order: 6
dir:
  order: 6
  link: true
index: false
icon: charm:binary
category:
  - CTF
  - Pwn
---

当源代码被编译成机器码，人类与机器之间只剩寄存器和堆栈的低语。Pwn是 CTF 中最硬核的角力场——你需要在内存的方寸之间，用溢出、UAF、格式化字符串、堆风水等技巧，让程序执行从未写下的路径。一道 Pwn 题就是一座微缩的城堡，你的 exploit 便是破城的攻城锤。每一段 shellcode 的诞生，都是对操作系统保护机制（NX、ASLR、Canary、PIE）的优雅嘲讽。

### 🗺️ 技能地图
Pwn 和 Reverse 是一体两面：Reverse 为了读懂，Pwn 则是为了控制。Pwn 方向陡峭的学习曲线往往会让许多人望而却步，但攻破系统的成就感也是无与伦比的。
- **前置知识**：C 语言与汇编基础、Linux 操作系统原理、进程内存布局（栈、堆、BSS 段等）。
- **基础漏洞**：栈溢出（Stack Overflow）、格式化字符串漏洞（Format String）、整数溢出。
- **利用技巧（Exploit）**：
  - ROP（返回导向编程）：通过拼接代码片段绕过防执行保护。
  - Hijack GOT / Ret2Libc：劫持函数解析与调用 C 库函数。
- **进阶领域**：
  - **堆利用（Heap Exploitation）**：UAF（释放后重用）、Fastbin Attack、Unsorted Bin 泄露。
  - 内核级漏洞利用（Kernel Pwn）、异构架构（ARM/MIPS Pwn）、浏览器漏洞利用。

### 🛠️ 常用工具
- **IDA Pro**：同样用于分析目标程序的静态逻辑。
- **GDB 及其插件 (Pwndbg)**：用于动态调试内存状态。
- **Pwntools**：Python 编写的库，用于编写和发送你的 Exploit 脚本。
- **Checksec**：查看目标程序的保护机制。
- **LibcSearcher**：用于在泄露地址后查找对应的 Libc 版本。
::: note
这些工具都需要你自己去寻找与安装。
:::
### 💡 萌新建议
不要死记硬背利用技巧！在学习栈溢出或堆结构时，强烈建议**拿出一张白纸和一支笔，把内存分布图画下来**。搞清楚每个指针指向哪里，每个字节被覆盖成了什么。纸上得来终觉浅，Pwn 出 Shell 靠画图。

受限于时间与能力，我们只更新到堆利用的最最最基础部分。
<Catalog />