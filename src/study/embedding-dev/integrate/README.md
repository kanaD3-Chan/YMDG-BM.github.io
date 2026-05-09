---
title: 第五章：整合——串口指挥的交响乐团
icon: mdi:puzzle
index: true
order: 5
dir:
  link: true
  order: 5
category:
  - 嵌入式开发
  - STM32
  - Embassy
---

散落的模块终于要汇聚成河。SDIO 读卡、VS1053 放音、AS5600 感知旋转——这一切在 main() 中串联，由串口统一调度，正式成为一台音乐播放器。

- 核心任务：统一时钟与中断配置，实现串口交互主循环。

<!-- more -->

<Catalog />
