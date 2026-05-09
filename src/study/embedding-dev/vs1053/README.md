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

TF 卡里的 WAV 文件是沉默的二进制。把它们变成声波，靠的是 VS1053——一颗独立的硬件音频解码器。

本章通过 SPI 总线驱动 VS1053，实现从硬件初始化到音乐播放、暂停、切歌和音量控制的完整链路。

- 核心任务：用 SPI 驱动 VS1053 实现 WAV 音频播放。

<!-- more -->

<Catalog />
