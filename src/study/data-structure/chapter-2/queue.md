---
title: 第二幕：队列
icon: material-symbols:power-outline
order: 2
category:
  - 数据结构
tag:
  - C/C++
  - 队列
---

## 序

队列是一种先入先出（FIFO, First-In-First-Out）的数据结构。如果说栈是"后来者居上"的独裁者，那队列就是"先来后到"的公平主义者——谁先排队，谁先被服务。

队列的应用遍布计算机科学的每个角落：操作系统的消息队列、CPU 的任务调度、网络数据包的缓冲、BFS 遍历——甚至你正在使用的键盘，也在用一个环形队列来缓冲你的按键。

这一幕，我们将复用上一幕的泛型栈，用两个栈来实现一个队列。这个看似不可能的构造，恰恰是算法设计中最优雅的"借力打力"。

<!-- more -->

## 队列的概念

一个队列支持两种基本操作：

- **入队（enqueue）**：将元素加入队尾
- **出队（dequeue）**：从队首取出元素

区别于栈的"同一端进出"，队列是"一端进、另一端出"。这看似微小的差异，却导致了完全不同的实现挑战——如果用数组实现，出队时需要移动所有元素（或者用环形缓冲）；如果用链表实现，需要同时维护头尾两个指针。

但我们这里选择一条更有趣的路：**用两个栈来模拟一个队列**。

## 双栈法：化 LIFO 为 FIFO

两个栈怎么能变成队列？这听起来像是在用两个只能倒着拿的箱子来模拟一个正常排队的队伍。但答案是——**倒一次**。

设想你有两个栈：一个叫 `tail`（入队栈），一个叫 `head`（出队栈）。

- **入队**：直接 push 到 `tail` 栈。简单。
- **出队**：如果 `head` 栈非空，直接从 `head` pop。如果 `head` 为空，就把 `tail` 栈的所有元素逐个 pop 出来、push 进 `head` 栈——这样一来，原本在 `tail` 栈底的元素（最早入队的），就变成了 `head` 栈顶的元素（最先出队的）。

一次"倒栈"操作，恰好逆转了两次 LIFO，等效于一次 FIFO。

```
入队序列: 1 2 3

入队后:
  tail: [1, 2, 3 <- 栈顶
  head: []

出队时 (head为空):
  将 tail 全部弹出并压入 head:
  head: [3, 2, 1 <- 栈顶
  tail: []

  从 head pop -> 1  (FIFO!)

再次入队 4:
  tail: [4 <- 栈顶
  head: [3, 2 <- 栈顶

出队 -> 2  (直接从 head pop，无需倒栈)
```

关键洞察：**每个元素最多被倒栈一次**，所以虽然单次出队可能触发 O(n) 的倒栈操作，但均摊下来每次出队是 O(1)。

## 队列的结构

我们直接复用上一幕的泛型栈（`stack.h`），队列只需要包装两个栈指针：

```C
#include "stack.h"

typedef struct Queue {
  Stack *head;   // 出队栈
  Stack *tail;   // 入队栈
  size_t len;    // 队列长度
} Queue;
```

一个队列无非就是两个栈加一个计数器。`len` 字段让我们可以 O(1) 获取队列长度，也方便做空队列判断。

## 队列操作的实现

### 创建队列

```C
Queue *create_queue() {
  Queue *queue = (Queue *)malloc(sizeof(Queue));
  if (queue == NULL)
    return NULL;
  queue->head = create_stack();
  queue->tail = create_stack();
  queue->len = 0;
  return queue;
}
```

两个栈由 `create_stack()` 各自初始化。初始状态下两个栈都为空。

### 入队

入队就是往 `tail` 栈 push。时间复杂度 O(1)：

```C
bool enqueue(Queue *queue, void *data, size_t size) {
  if (queue == NULL)
    return false;

  bool result = push(queue->tail, data, size);
  if (result)
    queue->len++;
  return result;
}
```

### 出队

这是双栈法的精髓所在。当 `head` 栈为空时，把 `tail` 栈全部"倒"过来：

```C
bool dequeue(Queue *queue, void *data, size_t size) {
  if (queue == NULL || queue->len <= 0)
    return false;

  // 如果 head 栈空了，把 tail 栈的元素全部搬过来
  if (is_empty(queue->head)) {
    while (!is_empty(queue->tail)) {
      void *tmp = malloc(size);
      if (pop(queue->tail, tmp, size))
        push(queue->head, tmp, size);
      free(tmp);
    }
  }

  if (is_empty(queue->head))
    return false;

  bool result = pop(queue->head, data, size);
  if (result)
    queue->len--;
  return result;
}
```

::: tip 为什么需要 malloc 一个临时变量？

因为栈的 `pop` 和 `push` 操作都需要 `void *data` 参数——`pop` 把数据拷贝出来，`push` 再把数据拷贝进去。我们无法直接在两个栈之间"转移"指针，只能通过一个临时缓冲区中转。当然，这是泛型设计的代价——如果数据是定长 int，可以直接用值传递，就不需要这个 malloc 了。
:::

### 判断空队列与查看队首

```C
bool is_empty_queue(Queue *queue) {
  return queue == NULL || queue->len <= 0 ||
         queue->tail == NULL || queue->head == NULL;
}

bool peek_queue(Queue *queue, void *data, size_t size) {
  if (queue == NULL || queue->len <= 0)
    return false;

  // 如果 head 为空，先倒一次栈
  if (is_empty(queue->head)) {
    while (!is_empty(queue->tail)) {
      void *tmp = malloc(size);
      if (pop(queue->tail, tmp, size))
        push(queue->head, tmp, size);
      free(tmp);
    }
  }

  data = peek(queue->head, size);
  return true;
}
```

`peek_queue` 和 `dequeue` 共享同一个"确保 head 非空"的逻辑——如果 head 为空就把 tail 倒过去。这个逻辑可以抽取为一个辅助函数，但为了展示清晰性，这里保持内联。

## 另一种实现：原地翻转链表

除了用栈的 push/pop 来"倒"，还有一种更底层的做法——直接翻转 `tail` 栈内部的链表。这就是 `/home/sunsi/data_structure/queue.c` 中的实现思路：

```C
int deQueue(Queue *queue) {
  if (queue == NULL) return -1;

  // 如果 front 栈空了，把 back 栈的链表整个反转过来
  if (queue->front->head == NULL) {
    if (queue->back->head == NULL) return -1;

    Node *prev = NULL;
    Node *curr = queue->back->head;
    while (curr != NULL) {
      Node *next = curr->next;
      curr->next = prev;   // 逐节点反转
      prev = curr;
      curr = next;
    }
    queue->front->head = prev;       // front 接管反转后的链表
    queue->front->len = queue->back->len;
    queue->back->head = NULL;        // back 清空
    queue->back->len = 0;
  }

  // 从 front 弹出
  Node *tmp = queue->front->head;
  int rst = tmp->data;
  queue->front->head = tmp->next;
  free(tmp);
  queue->front->len--;
  queue->len--;
  return rst;
}
```

这种方式绕过了逐元素 pop/push 的开销，一次性把整条链表翻转过来。它的时间复杂度仍然是 O(n)，但常数因子更小——因为不需要反复 malloc/free 临时变量。

两种实现各有优劣：
- **栈中转法**：复用了已有栈的 API，代码简洁，但每次倒栈都有 malloc/free 开销
- **链表翻转法**：直接操作底层数据结构，效率更高，但破坏了封装（需要知道栈内部是用链表实现的）

对于教学目的，栈中转法更清晰地展示了"两个 LIFO 叠加等于 FIFO"的数学本质。

## 应用：约瑟夫问题

约瑟夫问题（Josephus Problem）是一个经典的报数出局游戏：n 个人围成一圈，从第一个人开始报数，每数到第 m 个人就将其移出，下一个人重新从 1 开始报数，直到只剩一人。求最后剩下的是谁。

队列天然适合模拟这个过程：每次"报数"就是把队首的人出队，判断是否要淘汰——不淘汰就重新入队（排到队尾），淘汰就丢弃。这恰好模拟了"围成一圈"的循环特性。

```C
#define MAX_SIZE 9

int main() {
  Queue *queue = create_queue();

  // 1~8 号入队
  for (size_t i = 1; i < MAX_SIZE; ++i) {
    enqueue(queue, &i, sizeof(int));
  }

  int flag = 1;  // 1: 淘汰; 2: 重新入队
  while (!is_empty_queue(queue)) {
    int data;
    dequeue(queue, &data, sizeof(int));

    if (flag == 1) {
      printf("报数：%d\n", data);  // 此人出局
      flag = 2;
    } else {
      enqueue(queue, &data, sizeof(int));  // 排到队尾
      flag = 1;
    }
  }
  return 0;
}
```

这里我们设定"每数到第 2 个人淘汰"（m=2），所以用 `flag` 交替切换。出队的人如果是偶数次（flag=1）就淘汰，奇数次就重新入队排到末尾。

当 m 更大时，可以扩展为：

```C
int count = 1;
while (!is_empty_queue(queue)) {
  int data;
  dequeue(queue, &data, sizeof(int));

  if (count % m == 0) {
    printf("出局：%d\n", data);
  } else {
    enqueue(queue, &data, sizeof(int));
  }
  count++;
}
```

每次循环：队首出列 → 判断是否淘汰 → 不淘汰就排到队尾。这个过程完美复现了"围成一圈、逐次报数"的物理场景。

::: info 延伸思考

约瑟夫问题有 O(n) 的数学解（递推公式），但队列模拟提供了直观理解和验证。在面试和算法竞赛中，用队列模拟约瑟夫环是最自然的暴力解法，也展示了数据结构"将物理场景映射为操作序列"的能力。
:::

## 均摊分析：为什么双栈队列是高效的？

初看双栈法，`dequeue` 里有一个 `while` 循环——如果 tail 中有 n 个元素，倒栈操作就要执行 n 次 push 和 n 次 pop，看起来是 O(n)。但如果我们从**均摊**（amortized）的角度看：

- 每个元素入队时被 push 到 `tail`（1 次操作）
- 每个元素在倒栈时从 `tail` pop 出来、push 到 `head`（2 次操作）
- 每个元素出队时从 `head` pop 出来（1 次操作）

每个元素在整个生命周期中最多经历 4 次栈操作，均摊下来每次入队/出队是 **O(1)**。换句话说，虽然某一次 `dequeue` 可能很慢（触发倒栈），但把代价均摊到所有操作上，每次都是常数时间。

这就是均摊分析的核心思想——不看单次操作的峰值，而看一系列操作的总代价除以操作次数。

## 小结

这一幕，我们用两个栈实现了一个队列，展示了"化 LIFO 为 FIFO"的算法美感。队列的实现远不止这一种方式——环形缓冲、链表直接实现都是常见选择——但双栈法让我们深刻理解了栈和队列之间的内在联系：**两次反转等于一次正序**。

结合上一幕的栈，我们现在拥有了两个最基础、最常用的受限线性表。它们是操作系统消息队列的基石、是 BFS 的引擎、是生产者-消费者模型的核心数据结构。

下一章，我们将离开线性结构，进入树与二叉树的世界——届时，递归将正式登场。

[^first]: 双栈法实现队列最早可追溯至纯函数式编程中对不可变数据结构的探索。在 Haskell 等语言中，因为无法直接修改数据，双栈法几乎是实现函数式队列的标准做法。我们用 C 语言复现了这个思路，也算是一次"跨界"借鉴。
