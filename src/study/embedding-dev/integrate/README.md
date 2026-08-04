---
title: 第五章：整合——把模块变成播放器
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

前面的章节各自为战：SDIO 读卡、VS1053 放音、AS5600 采角度、TIM1 转电机。这一章把它们全部装进 `main.rs`，由 Embassy 统一调度，变成一台能播歌、能显示、能“打碟”的音乐播放器。

<Catalog />
