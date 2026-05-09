---
title: 第四章：I2C与AS5600——感知旋转的磁场
icon: mdi:magnet
index: true
order: 4
dir:
  link: true
  order: 4
category:
  - 嵌入式开发
  - STM32
  - I2C
  - AS5600
---

播放器只出声还不够——真正的 iPod 有一个 Click Wheel。本章用 AS5600 磁编码器捕捉旋钮的转动，为后续电机控制提供角度数据。

- 核心任务：通过 I2C 驱动 AS5600，读取角度并检测磁铁状态。

<!-- more -->

<Catalog />
