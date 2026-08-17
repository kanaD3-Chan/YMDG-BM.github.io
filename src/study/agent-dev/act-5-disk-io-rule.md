---
title: 第五幕 磁盘 IO 铁律：把安全从纪律变成类型
icon: mdi:folder-lock-outline
order: 5
category:
  - Agent 开发
tag:
  - Rust
  - Agent
  - 安全
---

# 第五幕 磁盘 IO 铁律：把安全从纪律变成类型

## 第一幕的承诺，漏了一个口子

第一幕里我说过：谁想绕过通道直接碰文件、碰配置、碰模型，机制上就不给。插件只能拿服务句柄，注册表管谁能调什么工具。

这句承诺有个漏洞，我写完第一幕之后隔了很久才补上：文件系统。

服务句柄管住了"插件能碰什么服务"，但没人管"插件能碰哪些文件"。业务插件里到处是裸的 `std::fs`——vision 读附件、grading 删暂存、practice 读真题池、memory 读写记忆。路径拼接各写各的，白名单各带各的（有的话）。第四幕里 uploads 的 canonicalize 白名单，就是这种散落检查的标本：一处有，其余看运气。

今天有没有 bug，其实无所谓。漏洞迟早会自己长出来，这才是问题。只要文件系统对插件是开放的，迟早有一行代码长成 `format!("{root}/{}", user_input)` 的样子。

场景 5 规划的时候，这个口子不能再拖了：图谱要落盘、调度要写文件、真题池要运行时更新——用户插件第一次要成规模地自己写文件。要么现在把磁盘收编，要么等第一起路径注入。

## 威胁模型：先讲清楚防谁

"铁律"这个词容易让人以为刀枪不入。所以先把边界说清楚，免得后面被问"那这也没防住啊"。

这条铁律防的是**路径参数注入**，来源有两个：插件自己写错了（bug），或者插件是恶意的。用户输入一路传到 `..\..\`、符号链接、Windows 的 `\\?\` 前缀，最后逃出数据根目录。

它不防的是**本地恶意进程**。能往你数据根目录里放符号链接的进程，本来就能读你的全部文件，绕过 storage 的校验对它没有意义。这一条防不住，也不该由它防。

还有一道缝：TOCTOU——校验完之后、open 之前，符号链接被人换掉。这个窗口没法完全关死，属于接受的残余风险，后面讲做了哪些消减。

想象一下攻击长什么样。假设某个插件里有这么一行（伪代码，构造的场景，没真存在过）：

```rust
let path = format!("{}/{}", data_root, user_input);
std::fs::write(&path, b"payload")?;
```

用户输入 `../../AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup/x.exe`，就写到了数据根目录外面。靠纪律防这个，等于要求每个插件作者在每次拼路径的时候都想起"这是外部输入"。纪律会累、会忘、会被下一个 contributor 忽略。

类型不会。

## RelPath：校验住在构造器里

先看这个结构。全文如下，没删一行：

```rust
pub struct RelPath {
    segments: Vec<String>,
}

pub fn parse(raw: &str) -> Result<Self, StorageError> {
    if raw.is_empty() {
        return Err(StorageError::InvalidPath("路径为空".into()));
    }
    let mut segments = Vec::new();
    for seg in raw.split('/') {
        let ok = !seg.is_empty()
            && seg
                .chars()
                .next()
                .is_some_and(|c| c.is_ascii_alphanumeric())
            && seg
                .chars()
                .last()
                .is_some_and(|c| c.is_ascii_alphanumeric())
            && seg
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-');
        if !ok {
            return Err(StorageError::InvalidPath(format!(
                "非法路径段：{seg}（仅允许字母数字开头结尾，中间 [a-zA-Z0-9._-]）"
            )));
        }
        segments.push(seg.to_string());
    }
    Ok(Self { segments })
}
```

规则就三条：段必须以字母数字开头和结尾；中间只允许 `[a-zA-Z0-9._-]`；空段、`.`、`..`、`\`、`:`、非 ASCII 全部拒绝。拒绝非 ASCII 是防同形字符，中文路径（比如记忆里知识点的名字）走 base64url 段编码，路径不再是给人看的，是给机器看的。

两个设计点值得说。

**fail-closed**。解析失败就是调用失败，没有降级、没有替换、没有"忽略这个字符继续"。校验收紧侧失效的时候，系统的默认姿态是拒绝。

**不做任何规范化**。看起来反直觉：把 `..` 折叠掉、把绝对路径转成相对路径，不是更安全吗？不。规范化即攻击面——你亲手把攻击向量翻译成合法路径，翻译器本身就成了被攻击的对象。RelPath 拒绝一切需要"理解"的输入，只放行不需要理解的东西。

所以"类型上不可能表示目录遍历"不是修辞。一个 `RelPath` 被构造出来，就只可能是白名单段拼出来的。想越界的人要过的不是一道检查，是类型系统。

## DomainIo：文件能力收进 trait，只发信任边界内

RelPath 管"路径长什么样"，DomainIo 管"谁能碰文件"。

数据根目录下划出五个域：

| 域 | 内容 |
|---|---|
| mistakes | 错题本 |
| sessions | 会话 JSONL |
| memory | 记忆 |
| data | 教学数据（真题池等） |
| uploads | 附件持久副本 |

域内文件能力是一个 trait：

```rust
#[async_trait]
pub trait DomainIo: Send + Sync {
    async fn read(&self, domain: Domain, rel: &RelPath) -> Result<Vec<u8>, StorageError>;
    async fn write(&self, domain: Domain, rel: &RelPath, bytes: &[u8]) -> Result<(), StorageError>;
    async fn remove(&self, domain: Domain, rel: &RelPath) -> Result<(), StorageError>;
    async fn remove_tree(&self, domain: Domain, rel: &RelPath) -> Result<(), StorageError>;
    async fn list(&self, domain: Domain) -> Result<Vec<String>, StorageError>;
    // 另有两个 *_legacy 方法，仅启动迁移用，这里略去
}
```

实现（storage 插件）内部负责：域根拼接、canonicalize 兜底（防符号链接逃逸）、原子写（临时文件 + rename）、审计（每次调用落一条 FileIo 记录）。

但重点不是这些检查，是**谁拿得到这个 trait**：内核插件。用户插件永远不持有 DomainIo，它们只见 StorageHandle 的四个语义方法：

```rust
pub async fn read_staged(&self, path: &str) -> Result<Vec<u8>, StorageError> { /* ... */ }
pub async fn remove_staged(&self, path: &str) -> Result<(), StorageError> { /* ... */ }
pub async fn read_data_file(&self, name: &str) -> Result<String, StorageError> { /* ... */ }
pub async fn write_data_file(&self, name: &str, content: &str) -> Result<(), StorageError> { /* ... */ }
```

插件能表达的，只有"读暂存附件""删暂存附件""读教学数据""写教学数据"。没有"打开任意文件"。语义方法内部照样走 RelPath：

```rust
pub async fn write_data_file(&self, name: &str, content: &str) -> Result<(), StorageError> {
    let domain = self.domain.as_ref().ok_or_else(|| StorageError::Internal("storage 未注入 DomainIo 能力".into()))?;
    let rel = RelPath::parse(name)?;
    domain.write(Domain::Data, &rel, content.as_bytes()).await
}
```

这是第一幕服务句柄的续集：文件描述符换成了文件语义。操作系统不会把整个文件系统塞给用户态进程，这里也不给插件。

## TmpIo：散落白名单的收编

附件暂存是另一条通道：系统临时目录里的文件，硬编码 `mistake-agent-` 前缀白名单。第四幕讲附件管线时提过，vision 读、grading 删。

收编前，这套白名单逻辑散落在各个插件里，每个插件自己实现一遍"这个路径合法吗"。收编后就剩一个 trait：

```rust
#[async_trait]
pub trait TmpIo: Send + Sync {
    async fn read_staged(&self, path: &str) -> Result<Vec<u8>, StorageError>;
    async fn remove_staged(&self, path: &str) -> Result<(), StorageError>;
}
```

白名单活在唯一实现点。第一幕那句话在这里兑现了：一处检查，好过人人自觉。

收编完成后数了一下：生产代码里用户插件零文件句柄，`std::fs` 只剩测试代码里自建临时目录的几处。

## 收个尾

同一条决策里还出生了数据运行时化：真题池从 `include_str!` 变成数据根目录 `data/` 下的运行时文件，种子兜底。只有 `verify_geometry.py` 维持 `include_str!`——它是代码，不是数据。这件事一笔带过，它是另一个故事。

回到开头的承诺。第一幕说"机制上就不给"，这一次文件系统真的收进了机制。安全从纪律变成类型：想越界的插件不是"违反了规矩"，是"写不出这样的代码"。

下一幕讲剥离：把 Agent core 从错题业务里抠出来，做成独立的 so-lite-agent crate。为了把它抽出去，我推翻了自己定的单 crate 红线。等它上线那天，这套 IO 铁律要整体跟着 crate 走——边界这东西，搬家的那一刻才见真章。

仓库：[kanaD3-Chan/mistake-agent](https://github.com/kanaD3-Chan/mistake-agent)
