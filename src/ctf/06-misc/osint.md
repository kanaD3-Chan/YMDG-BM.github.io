---
title: OSINT 开源情报
order: 8
icon: mdi:magnify-expand
category:
  - CTF
  - 手册
  - Misc
---

OSINT（Open Source Intelligence，开源情报）是指从公开渠道收集和分析信息。CTF 中的 OSINT 题通常要求你根据有限的线索，找到某个人、地点或事件的具体信息。

## 图片溯源

### 反向图片搜索

```
工具：
- Google 图片搜索（以图搜图）
- Bing 图片搜索
- Yandex（对风景照效果最好）
- TinEye（专注于精确匹配）
```

**操作**：把图片上传到搜索引擎，找到原始来源或相似图片。

### EXIF 信息提取

```bash
exiftool image.jpg
```

重点关注：
- **GPS 坐标**：直接给出拍摄地点
- **拍摄时间**：确定事件时间线
- **设备型号**：辅助判断真实性
- **软件信息**：可能暴露编辑痕迹

```python
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def get_gps(image_path):
    img = Image.open(image_path)
    exif = img._getexif()
    if not exif:
        return None

    gps_info = {}
    for tag_id, value in exif.items():
        tag = TAGS.get(tag_id)
        if tag == 'GPSInfo':
            for gps_tag_id, gps_value in value.items():
                gps_tag = GPSTAGS.get(gps_tag_id)
                gps_info[gps_tag] = gps_value

    return gps_info
```

### 地理位置识别

从图片内容推断地点：

1. **地标建筑**：搜索图片中的建筑、雕塑、标志
2. **文字信息**：路牌、店名、车牌（注意语言和格式）
3. **植被和地形**：判断大致地区
4. **太阳角度**：结合时间推断方向和纬度
5. **Google Street View**：在可能的地点附近拖动查看

## 人物信息收集

### 用户名追踪

```bash
# sherlock：在数百个网站上搜索用户名
pip install sherlock-project
sherlock username

# whatsmyname：类似工具
```

### 邮箱信息

```bash
# theHarvester：收集邮箱、子域名等
theHarvester -d example.com -b google

# hunter.io（在线工具）：查找公司邮箱格式
```

### 社交媒体

```
平台搜索技巧：
- Twitter/X：高级搜索，按时间、地点过滤
- LinkedIn：搜索公司员工
- GitHub：搜索用户名、邮箱、代码中的敏感信息
- Instagram：地理标签、标签搜索
```

## 域名与 IP 信息

```bash
# whois 查询
whois example.com

# DNS 记录
dig example.com ANY
nslookup example.com

# 子域名枚举
subfinder -d example.com
amass enum -d example.com

# IP 地理位置
curl ipinfo.io/8.8.8.8

# 历史 DNS 记录（找真实 IP）
# SecurityTrails、PassiveDNS
```

## 网页存档

```bash
# Wayback Machine：查看网页历史版本
# https://web.archive.org/web/*/example.com

# 用 Python 查询
import requests
url = "http://archive.org/wayback/available?url=example.com"
data = requests.get(url).json()
print(data['archived_snapshots'])
```

## GitHub 信息泄露

```bash
# 搜索敏感信息
# GitHub 搜索语法：
# filename:.env password
# extension:pem private
# "api_key" user:username

# truffleHog：扫描 git 历史中的敏感信息
pip install truffleHog
trufflehog https://github.com/user/repo
```

## CTF OSINT 解题流程

1. **收集所有线索**：图片、用户名、邮箱、域名等
2. **反向图片搜索**：找到图片来源
3. **提取元数据**：EXIF、文件属性
4. **社交媒体搜索**：追踪用户名
5. **地理位置确认**：Google Maps/Street View 验证
6. **交叉验证**：用多个来源确认信息

## 常用工具汇总

| 工具 | 用途 |
|------|------|
| [Maltego](https://www.maltego.com/) | 可视化关系图谱 |
| [Shodan](https://www.shodan.io/) | 搜索联网设备 |
| [Censys](https://censys.io/) | 互联网资产搜索 |
| [FOFA](https://fofa.info/) | 国内网络空间搜索 |
| [ExifTool](https://exiftool.org/) | 元数据提取 |
| [Sherlock](https://github.com/sherlock-project/sherlock) | 用户名追踪 |

## 练手资源

- [OSINT Framework](https://osintframework.com/) — OSINT 工具导航
- Trace Labs CTF — 专注 OSINT 的 CTF 比赛
- 攻防世界 Misc OSINT 题目
