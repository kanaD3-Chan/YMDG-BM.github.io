---
title: 第四章：转盘电机与角度反馈
icon: mdi:magnet
index: true
order: 4
dir:
  link: true
  order: 4
category:
  - 嵌入式开发
  - STM32
  - AS5600
---

播放器只出声还不够——真正的唱片机会转。这一章搞定“转盘”：AS5600 磁编码器负责感知角度，TIM1 输出三路正弦 PWM 驱动无刷电机。

电机控制是纯开环的：没有电流传感器，软件按电角速度推算三相电压相位。简单，但够用。

<Catalog />
