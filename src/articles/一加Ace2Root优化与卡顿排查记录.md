---
title: 一加 Ace 2 Root 优化与卡顿排查记录
icon: mdi:cellphone
category:
  - 文章
tag:
  - Android
  - ADB
  - Root
  - 性能优化
---

一加 Ace 2（PHK110），Android 16，ColorOS 16.0.5.700(CN01)。Root 是 Magisk + KernelSU，还挂着 LSPosed 模块、uperf、Shamiko。接手时手机连续开机 15 天，220G 存储用了 83%，Swap 压着 2.6G，负载 20~30，电池 37°C，卡得不想用。

<!-- more -->

整台手机从体检到清理，所有删除、杀进程的操作都是逐项确认过才动手的，路径全部精确指定，没用通配符扫射。

## 体检先于动手

连上 adb 先看状态，不碰任何文件：

```bash
adb devices -l
adb shell top -b -n 1 -d 2 | head -40
adb shell dumpsys battery | head -20
adb shell "du -k -d 1 /data/media/0 | sort -rn | head -15"
```

最先注意到的是两个 root 脚本：`/data/adb/service.d/0000liveboot` 和 `/data/adb/post-fs-data.d/0000liveboot` 在无限空转。脚本等一个 LiveBoot 应用的目录，这应用早卸载了，目录永远不会出现，`while true; sleep 0.1` 就这么转了 15 天，两个进程各烧掉 200 多小时 CPU。

另外微信两个进程合计 170~250% CPU，system_server 接近 100%，SystemUI 一度 85%。存储那边 QQ 25.6G，光聊天原图 chatraw 就 9.2G，微信 3.8G，DCIM 17.9G。

## 先修 liveboot

确认 LiveBoot 目录确实不存在后，杀掉两个空转进程，脚本改名禁用而不是删除，留着后悔药：

```bash
adb shell "su -c 'kill 1513 2883'"
adb shell "su -c 'mv /data/adb/service.d/0000liveboot /data/adb/service.d/0000liveboot.disabled'"
adb shell "su -c 'mv /data/adb/post-fs-data.d/0000liveboot /data/adb/post-fs-data.d/0000liveboot.disabled'"
```

效果立刻能看见：1 分钟负载从 20~30 掉到 10，电池温度从 37°C 降到 32.4°C。不过手机还是卡，大头在后面。

## 磁盘清理，一次授权一次动手

流程是：我列清单，用户点名，我才执行。

第一轮删 QQ 聊天原图和纯缓存，约 16.5G。chatraw 是 17.5 万个聊天原图文件，删了旧聊天记录里图片会空，这条用户明确同意。chatthumb 4.3G、表情贴纸缓存、diskcache、hotpic、head、msflogs 日志这些删了会自动重建。删完可用空间 38G 涨到 54G。

第二轮是第一类缓存 22 项，约 19.9G：相册 blob_cache 3.5G、QQ 空间下载缓存 3.2G、会员素材 2.4G、qzonepic 1.9G、微信小程序资源 1.2G、xlog 日志 1.1G，加上 QQCommon、ZRes、缩略图这些，全是可再生缓存。

第三轮是语音、项目、录音。微信 voice2 + record、QQ ptt 语音删掉，消息记录还在，语音文件没了；vs1053_rust 和差分两个项目文件夹删掉；录音里 ≥40M 的 7 个大文件列出来确认过再删，约 360M。通义千问和 TapTap 用 `pm clear` 清数据，应用留着，重新登录就行。

三轮加完，可用空间到 79G。后来搬相册又腾出 3G，到 82G，使用率从 76% 降到 63%。

## 预装应用，禁了一批

系统应用挨个筛过，按"基本没用 / 看用不用 / 建议保留"分三档给用户挑。最后禁了 15 个：广告服务、一加社区、一加会员、OPPO 商城、阅读、福利中心、欢太会员、车钥匙、K歌、儿童空间、家庭守护，还有百度输入法（用户在用搜狗）、系统统计上报、众测、音乐。

统一 `pm disable-user --user 0`，不卸载不动数据，想恢复一条 `pm enable` 的事。

中间有个小坑：验证状态时 `pm list packages -d` 查不到部分包，差点以为没禁掉。实际 disabled-user 在 `dumpsys package` 里是 `enabled=3`，以 dumpsys 为准。

## 相册查重，结果很干净

DCIM + Pictures 一共 8465 张图，全部算 MD5 找完全重复：

```bash
adb shell "su -c 'find /data/media/0/DCIM /data/media/0/Pictures -type f \( -iname \"*.jpg\" -o -iname \"*.png\" ... \) -print0 | xargs -0 md5sum'"
```

42 组重复加起来才 30M，主要是连拍 HEIC 的副本。相册里没有值得删的重复。

真正占地方的是 39 张大图：26 张 `_DSC*.png` 加 13 张超过 20M 的图，共 2.04G。用户决定搬到电脑 `~/Pictures/phone_big_images`。`adb pull` 对部分文件 Permission denied，走 root 通道：

```bash
adb exec-out su -c "cat '/data/.../_DSC0145.png'" > ~/Pictures/phone_big_images/...
```

39 张逐张校验字节数一致后，手机原件才删。

## 卡顿的元凶，查了挺久

磁盘干净了还是卡。顺着 CPU 挖下去，看到一条链路：

- `com.byyoung.setting` 的 `pool-5-thread-1` 线程稳定 26% CPU，累计 444 小时。这应用装了个电池小组件服务，一直在后台轮询电量。
- system_server 的 binder 线程轮着烧，`binder:3382_8`、`_13`、`_4`、`_7` 都能冲到 25~43%。
- `android.hardware.health@2.1-service` 稳定 30%+，80% 时间耗在内核态。查了它的 timerfd，定时器 60 秒才触发一次，其实它自己没在空转，是被外面调用拖起来的。

推测是 byyoung 轮询电池 → system_server 电池服务 → health HAL 一条龙。给 byyoung 上了后台限制：

```bash
su -c 'cmd appops set com.byyoung.setting RUN_IN_BACKGROUND ignore'
su -c 'dumpsys deviceidle whitelist -com.byyoung.setting'
```

限制管不住已经跑起来的线程，health 还是 24~33%。用户怀疑是 LSPosed 模块 LuckyTool 的锅，关了个开关也没明显变化，最后决定重启。

重启后 health 直接归零，byyoung 的轮询线程也空了（重启前累计 444 小时，重启后 0.13 秒）。Swap 从 4G 降到 126M。LuckyTool 的开关和重启同时发生，没法单独归因，但结果是对的。

## 系统垃圾

重启稳定后又扫了一遍 `/cache`、`/data/local`、tombstones、anr、dropbox、应用 cache、媒体回收站。清掉约 1G：微信缓存 775M、2024 年的旧模块包 119M、崩溃转储 29M、系统日志 12M、ANR 2.3M、浏览器缓存 58M、转码和回收站垃圾 10M，还有用户确认弃用的 frida-server 53M。`bbk/ebk/sys-ca-copy/luckys` 这些和系统、工具相关的没动。

对要留目录的路径用 `find <dir> -mindepth 1 -delete`，免得重建目录时权限不对。

## Download 和根目录

Download 目录 449M 也过了一遍。第一类拖拽缓存、临时目录里的孤儿 PDF、QwenDownloads 重复的 PPT、倒数日安装包全清；第二类只留了 LuckyTool 的 APK，这工具还在用。侧边栏传输残留里有一本《操作系统真象还原》PDF，215M，先搬到电脑（`~/Downloads/操作系统真象还原.pdf`，字节校验一致）再删的手机原件。

根目录（`/storage/emulated/0`）整体看了一遍，37.6G 里 DCIM 17G、Android 15.3G、Pictures 3.1G、Music 1.8G 都是用户自己的内容。剩下一些空壳目录（`ddddd`、`eh`、`qvs`、`OSSLog` 这类，合计不到 1M）和三个代码项目文件夹（`ServiceLogos-main`、`ProgrammingVTuberLogos-main`、`oua_classifier`）、vFlat 扫描件、说明书 PDF。用户决定这次不动，保持原样。

收尾时手机状态：136G 已用 / 84G 可用，使用率 62%。

## 几个坑

- zsh 的 while read 循环变量不能叫 `path`，它是和 `PATH` 绑定的特殊数组，一赋值整个 PATH 就废了，循环里所有命令直接 command not found。
- `adb shell` 在 while read 循环里会吞 stdin，循环只执行第一行。要么一次把参数传完，要么给 adb 加 `< /dev/null`。
- `adb pull` 读不了 `/data/media/0` 下部分应用文件，`adb exec-out su -c cat` 走 root 通道可以。
- 判断应用是否禁用，`pm list packages -d` 会骗人，`dumpsys package` 的 `enabled=3` 才是真相。
