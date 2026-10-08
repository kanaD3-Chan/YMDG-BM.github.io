---
title: Deepseek-R1 本地部署小记
icon: mdi:wrench
category:
  - 文章
tag:
  - AI
  - 部署
  - 笔记
---

最近deepseek-r1挺火的，大概研究了一下怎么本地部署。

这里我用的是Ollama，基本上可以开箱即用，非常方便。

<!-- more -->

## Windows 平台

我用的配置如下：

| 硬件 | 详细信息 |
| --- | --- |
| CPU | AMD Ryzen 9 7940HX 16 Cores 32 Threads |
| GPU | RTX 4060 Laptop 8GB |
| 内存 | 32GB DDR5 5200MT/s |
| 操作系统 | Windows 11 Pro |

Windows平台上只用到官网[Download Ollama on Windows](https://ollama.com/download)下载Ollama安装就行了。

安装完成后，在命令行输入

`ollama run deepseek-r1:8b`

即可，它会自动下载需要的模型文件。

实测速度如下：

```
total duration:       1m13.3695657s
load duration:        41.8234ms
prompt eval count:    65 token(s)
prompt eval duration: 322ms
prompt eval rate:     201.86 tokens/s
eval count:           1461 token(s)
eval duration:        1m12.441s
eval rate:            20.17 tokens/s
```

显存占用了7.1GB，还是很吃显存的。

token输出速度还是可以的，但是准确性很明显不太行。

## Linux 平台

为了追求更好的效果，我购买了一天的GPU服务器用来测试。

我使用了AutoDL的算力资源，配置如下：

| 硬件 | 详细信息 |
| --- | --- |
| CPU | Intel Xeon Gold 6130 6 Cores |
| GPU | NVIDIA Tesla V100 32GB |
| 内存 | 25GB |

同样地，也是使用Ollama部署。

`curl -fsSL https://ollama.com/install.sh | sh`

这里部署了32b的模型。

需要先ollama serve启动ollama的服务，然后才能run。

```
root@server:~# ollama serve    			#终端1
root@server:~# ollama run deepseek-r1:32b 	#终端2
```

测试下来，速度如下：

```
total duration:			44.762242265s
load duration:			27.576243ms
prompt eval count:		1973 token(s)
prompt eval duration:		2.85s
prompt eval rate:		692.28 tokens/s
eval count:			1032 token(s)
evalduration:			41.86s
eval rate:			24.65 tokens/s
```

显存占用约22GB，依然是非常吃显存的，但内容质量还算可以，用于家用部署已经处于可用状态了。

## 自己写的可用配置单

总结了一个可以家用部署deepseek-r1:32b 模型的可用配置单，有条件的话可以实践一下。

| 硬件 | 详细信息 | 花费（元） |
| --- | --- | --- |
| 主板 | ASUS X99-A | 500 |
| CPU | Intel Xeon E5-2680 v3 12 Cores 24 Threads | 40 |
| 内存 | DDR4 16GB 2133MT/s ECC \*4 | 300 |
| 散热 | 6热管三风扇风冷 | 50 |
| GPU | NVIDIA GeForce RTX 2080Ti 22GB魔改版\*2 + NVLink | 5000 |
| 硬盘 | 铠侠 RC20 1TB 全新固态 | 420 |
| 电源 | 鑫谷 1250W 金牌 全新 | 800 |
| 机箱 | 先马 坦克3 全新 | 170 |
| 共计 | - | 7280 |
