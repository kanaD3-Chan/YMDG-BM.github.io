---
title: 栈与队列
icon: material-symbols:layers
order: 2
category:
  - Wiki
  - 数据结构
---

栈（LIFO）和队列（FIFO）是两种受限线性表，均可用顺序表或链表实现。

<!-- more -->

## 对比速查

| 特性 | 栈（Stack） | 队列（Queue） |
|---|---|---|
| 插入 | push（栈顶） | enqueue（队尾） |
| 删除 | pop（栈顶） | dequeue（队首） |
| 查看 | peek（栈顶） | peek（队首） |
| 存取规则 | **LIFO**（后进先出） | **FIFO**（先进先出） |
| 经典应用 | 函数调用栈、DFS、括号匹配 | 消息队列、BFS、任务调度 |

## 栈

### 链表实现（泛型 void*）

```c
typedef struct Node {
    void *data;
    struct Node *next;
} Node;

typedef struct Stack {
    Node *head;
    size_t len;
} Stack;
```

### API 表

```c
Stack* create_stack();
bool   push(Stack *s, void *data, size_t size);  // 头插法 O(1)
bool   pop(Stack *s, void *data, size_t size);   // 头删法 O(1)
void*  peek(Stack *s, size_t size);               // 查看栈顶 O(1)
bool   is_empty(Stack *s);                         // 判空 O(1)
void   drop_stack(Stack *s, size_t size);          // 销毁 O(n)
void   show_stack(Stack *s, void (*print)(void*)); // 遍历 O(n)
```

::: tip 泛型原理
`void*` 配合 `size` 参数 + `memcpy` 实现类型无关的存储。每个操作都需要 `size` 来确定拷贝多少字节。
:::

### 实现要点

```c
// push：头插法（栈顶=链表头）
bool push(Stack *stack, void *data, size_t size) {
    Node *elem = malloc(sizeof(Node));
    elem->data = malloc(size);
    memcpy(elem->data, data, size);
    elem->next = stack->head;    // 新节点插在头部
    stack->head = elem;
    stack->len++;
    return true;
}

// pop：头删法
bool pop(Stack *stack, void *data, size_t size) {
    Node *tmp = stack->head;
    memcpy(data, tmp->data, size);  // 拷出数据
    stack->head = tmp->next;        // 跳过栈顶
    free(tmp->data);
    free(tmp);
    stack->len--;
    return true;
}
```

## 队列（双栈法）

### 思想

$$FIFO = LIFO \circ LIFO$$

两个栈（tail + head），数学上等价于一个队列：
- **入队** → push 到 tail 栈
- **出队** → 如果 head 空，把 tail 全倒入 head；从 head pop

### 结构

```c
typedef struct Queue {
    Stack *head;   // 出队栈
    Stack *tail;   // 入队栈
    size_t len;
} Queue;
```

### 均摊分析

每个元素的生命周期最多经历 4 次栈操作：
> tail-push(1) → tail-pop(2) → head-push(3) → head-pop(4)

均摊 O(1)。

### 核心出队逻辑

```c
bool dequeue(Queue *queue, void *data, size_t size) {
  if (is_empty(queue->head)) {
    // 倒栈：tail 全搬进 head
    while (!is_empty(queue->tail)) {
      void *tmp = malloc(size);
      pop(queue->tail, tmp, size);
      push(queue->head, tmp, size);
      free(tmp);
    }
  }
  return pop(queue->head, data, size);  // O(1)
}
```

## 经典应用

::: tabs#apps

@tab DFS 迷宫寻路

```c
// 栈 + 回溯 = 深度优先搜索
while (!is_empty(s)) {
    Pos *cur = peek(s);
    if (is_target(cur)) { record_path(s); pop(s); }
    else if (has_next_dir(cur)) {
        advance(cur);
        push(s, next_pos);
    } else {
        pop(s);  // 回溯
        visited[cur] = 0;
    }
}
```

@tab 约瑟夫问题

```c
// 队列模拟：出队 → 判断 → 淘汰或重新入队
while (!is_empty_queue(q)) {
    dequeue(q, &data);
    if (count % m == 0) printf("出局: %d\n", data);
    else enqueue(q, &data);  // 排到队尾
    count++;
}
```

:::

## 交叉引用

- [线性表：顺序表与链表](./linear-list.md) — 栈/队列的底层实现基础
- [复杂度速查](./complexity.md)
