---
title: 记一次Kali Linux引导修复
icon: mdi:wrench
category:
  - 文章
tag:
  - 笔记
  - Linux
  - 引导修复
---

不知道发生了什么，kali的引导突然崩掉了。EFI分区的/EFI/kali/grubx64.efi明明还在，但是bios就是不识别。

于是进行了一次修复，折腾了将近一个小时。

笔者的配置是：华硕天选5Pro 锐龙版笔记本电脑

CPU：AMD Ryzen 9 7940HX

GPU：NVIDIA GeForce RTX 4060 Laptop

双16G DDR5 5200MHz

原机预装的1T SN560被我移到了1号盘位，0号盘位是Colorful CN600 Pro 1TB

<!-- more -->

下面是折腾的路线：

# 1. 尝试Ubuntu Live CD修复

刚好手头有个刷了ventoy的盘，里面有一个完整的Ubuntu desktop 24.10镜像。于是启动一下，然后尝试使用fsck修复。

先sudo -s，获取一下root权限。

然后fdisk -l，看一下分区在哪里。这个有时候可能还会随着重启系统改变，注意不要看错了。

这里看到在nvme0n1这个盘有一个100MB左右的EFI分区，还有个100GB左右的ext4分区，就是它了。

挂载一下看看里面有没有丢文件。

`mount /dev/nvme0n1p1 /mnt/boot/efi`这个是EFI分区

`mount /dev/nvme0n1p2 /mnt`这个是kali的根分区

看了一下，grubx64.efi还在，怎么会报错呢？很奇怪。

猜测可能是文件系统出现了问题，尝试用fsck修复，无果。

又尝试efibootmgr看一下efi的详细信息，但因为LiveCD环境问题，报错：`EFI variables are not supported on this system.`

无果。尝试直接用grub启动一下试试，刚好这个盘有grub。

# 2. grub手动启动

于是又重启进了grub，这里磁盘表示和linux还有些区别，是(hd0,msdos0)这样的格式。

然后`set root=(hd2,msdos2)`把kali根分区挂载上。

`linux /boot/vmlinuz-6.12.33-kali1-amd64`

`initrd /boot/initrd.img-6.12.33-kali1-amd64`

`boot`

可以启动，但是卡到了busybox，依然行不通，啥都没有。

# 3. ventoy直接引导efi文件

这时笔者突然想起来ventoy是可以直接引导efi文件的。

于是再次重启，进入了ventoy。

按F2，进入手动引导模式。

导航进EFI分区，到EFI/kali/

找到了grubx64.efi，回车启动，引导成功。

成功进入系统，sudo -i提权

然后grub-install修复一下grub，再efibootmgr验证

kali引导项又出现了。

至此，修复成功。
