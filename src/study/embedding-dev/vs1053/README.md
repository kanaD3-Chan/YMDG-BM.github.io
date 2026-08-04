---
title: 第三章：SPI与VS1053——让硅片唱歌
icon: mdi:volume-high
index: true
order: 3
dir:
  link: true
  order: 3
category:
  - 嵌入式开发
  - STM32
  - SPI
  - VS1053
---

SD 卡里的 WAV 文件是沉默的二进制。把它们变成声波，靠的是 VS1053——一颗独立的硬件音频解码芯片。主控只负责搬运数据，解码和数模转换全交给它。

本章走完 VS1053 的完整链路：硬件接线、SCI 寄存器初始化、SDI 音频流推送，以及播放状态机。

<Catalog />
