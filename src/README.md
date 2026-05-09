---
home: true
catalog: false
icon: house
title: 项目主页
heroImage: logo.png
bgImage: /assets/bg/green.jpg
bgImageDark: /assets/bg/green-dark.png
bgImageStyle:
  background-attachment: fixed
heroText: KanaDE Notes
tagline: 个人技术知识库与学习记录
actions:
  - text: 学习笔记
    icon: book
    link: ./study/
    type: primary

  - text: 本博客Github仓库
    icon: mdi:github
    link: https://github.com/kanaD3-Chan/YMDG-BM.github.io

  - text: CTF Writeup
    icon: flag
    link: ./ctf/

highlights:
  - header: 📚 学习笔记
    description: 记录日常学习的技术知识与心得
    image: /assets/image/book-svgrepo-com.svg
    bgImage: /assets/bg/yellow.jpg
    bgImageDark: /assets/bg/yellow-dark.jpg
    highlights:
      - title: 数据结构
        icon: sitemap
        details: 数据结构基础与算法分析
        link: ./study/data-structure/

      - title: 操作系统
        icon: desktop
        details: 操作系统原理与内核分析
        link: ./study/operating-system/

      - title: 更多领域
        icon: plus-circle
        details: 持续更新的技术学习笔记
        link: ./study/

  - header: 🖥️ 运维文档
    description: 社团服务器管理与运维经验记录
    image: /assets/image/advanced.svg
    bgImage: /assets/bg/white.jpg
    bgImageDark: /assets/bg/white-dark.jpg
    features:
      - title: 服务器配置
        icon: server
        details: 服务器环境搭建与配置指南
        link: ./operation/

      - title: 服务部署
        icon: cloud
        details: 各类服务的部署与维护
        link: ./operation/

      - title: 监控与安全
        icon: shield
        details: 服务器监控与安全加固
        link: ./operation/

      - title: 故障排查
        icon: bug
        details: 常见问题与解决方案
        link: ./operation/

  - header: 🏴 CTF
    description: CTF 入门指路
    image: /assets/image/flag-svgrepo-com.svg
    bgImage: /assets/bg/red.jpg
    bgImageDark: /assets/bg/red-dark.jpg
    features:
      - title: Web安全
        icon: globe
        details: Web漏洞挖掘与利用
        link: ./ctf/web/

      - title: 逆向工程
        icon: devicon-plain:ghidra
        details: 二进制程序分析与逆向
        link: ./ctf/reverse/

      - title: 密码学
        icon: lock
        details: 密码学算法与攻击方法
        link: ./ctf/crypto/

      - title: 杂项
        icon: puzzle-piece
        details: 其他各类题型解法
        link: ./ctf/misc/

  - header: 🚀 快速开始
    description: 了解如何使用本Wiki
    image: /assets/image/compass-svgrepo-com.svg
    bgImage: /assets/bg/pink.jpg
    bgImageDark: /assets/bg/pink-dark.jpeg
    highlights:
      - title: 内容导航
        icon: compass
        details: 如何快速找到需要的内容
        link: ./guide/#全站地图-六个核心领域

      - title: 搜索功能
        icon: material-symbols:search
        details: 使用搜索快速定位信息
        link: ./guide/#_1-高效检索


copyright: false
footer: 使用 <a href="https://theme-hope.vuejs.press/zh/" target="_blank">VuePress Theme Hope</a> 主题 | MIT 协议, 版权所有 © 2026-至今 KanaDE

---

<style>
    /* 优化首页可阅读性 */
    main.vp-project-home>*>*.light::after {
        content: " ";
        position: absolute;
        inset: 0;
        z-index: 1;
        display: block;
        background-color: #ffffff80;
    }

    main.vp-project-home>*>*.dark::after {
        content: " ";
        position: absolute;
        inset: 0;
        z-index: 1;
        display: block;
        background-color: #00000080;
    }
</style>

<style>
    /* 你这主页怎么还有个黑坨坨啊.jpg */
    html[data-theme=dark] .vp-project-home img[src="/assets/image/compass-svgrepo-com.svg"] {
        filter: invert(1);
    }
</style>

<style>
    /* 把主页的段落变大 */
    main.vp-project-home>*:not([vp-content]) {
        min-height: 100vh;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>

<style>
    /* 加上翻页效果 */
    html {
        scroll-snap-type: y mandatory;
    }

    main.vp-project-home>*:not([vp-content]) {
        scroll-snap-align: center;
        scroll-snap-stop: always;
    }

    main.vp-project-home ~ footer {
        scroll-snap-align: end;
        scroll-snap-stop: always;
    }
</style>