---
title: 线性表：顺序表与链表
icon: material-symbols:list
order: 1
category:
  - Wiki
  - 数据结构
---

线性表的两种物理实现：顺序表（连续内存）与链表（指针链接）。

<!-- more -->

## 对比速查

| 维度 | 顺序表（SqList） | 链表（LinkedList） |
|---|---|---|
| 存储方式 | 连续内存（数组） | 节点 + 指针 |
| 随机访问 | **O(1)** | O(n) |
| 插入/删除 | O(n)（需移动元素） | **O(1)**（已定位后） |
| 空间开销 | 可能浪费预留容量 | 每个节点额外存指针 |
| 内存碎片 | 需连续大块内存 | 可分散存储 |
| 缓存友好 | **是**（局部性好） | 否（指针跳跃） |

## 顺序表

### 结构定义

```c
typedef struct {
    int *data;           // 数据区指针
    size_t size;         // 当前元素个数
    size_t capacity;     // 当前分配容量
} SqList;
```

### 核心操作

```c
SqList* createSqList(int capacity);                      // 创建
void    destroySqList(SqList *list);                      // 销毁
bool    updateSqListCapacity(SqList *list, int cap);      // 重新分配容量
bool    insertSqListElem(SqList *list, size_t pos, int data);  // 插入 O(n)
bool    removeSqListElem(SqList *list, size_t pos);            // 删除 O(n)
bool    getSqListByIndex(int *result, SqList *list, size_t idx); // 按位查 O(1)
bool    getSqListByData(size_t *idx, SqList *list, int data);    // 按值查 O(n)
void    showSqListElem(SqList *list);                           // 遍历 O(n)
```

### 扩容策略

```c
// 插入时自动扩容（翻倍）
if (sqList->size == sqList->capacity) {
    int new_cap = (sqList->capacity == 0) ? 1 : sqList->capacity * 2;
    updateSqListCapacity(sqList, new_cap);
}
```

均摊下来每次插入为 **O(1)**。

### 元素移动

```c
// 插入：pos 起所有元素后移一位
memmove(&data[pos + 1], &data[pos], (size - pos) * sizeof(int));

// 删除：pos 后的元素前移一位
memmove(&data[pos], &data[pos + 1], (size - pos - 1) * sizeof(int));
```

::: tip 为什么用 memmove 而非 memcpy？
`memmove` 能正确处理源和目标内存区域重叠的情况，而 `memcpy` 不保证。
:::

## 链表

### 节点结构

```c
typedef struct Node {
    int data;               // 数据域
    struct Node *next;      // 后继指针
} Node;
```

### 核心操作（以学生管理系统为例）

```c
LListNode* createLList();                                    // 创建
void  LListAddStudent(LListNode *head, Student stu, int pos); // 插入
void  LListDeleteStudent(LListNode *head, int id);            // 按 ID 删除
void  LListModifyStudent(LListNode *head, int id, Student s); // 按 ID 修改
void  LListShowStudent(LListNode *head, int id);              // 按 ID 显示
void  LListlookUpScore(LListNode *head, int id);              // 按 ID 查分数
void  LListDrop(LListNode *head);                             // 销毁整个链表
```

### 删除节点

```c
void LListDeleteStudent(LListNode *head, int id) {
    // pre 记录前驱，cur 遍历
    while (cur != NULL && cur->student.id != id) {
        pre = cur;
        cur = cur->next;
    }
    if (cur != NULL) {
        pre->next = cur->next;  // 跳过被删节点
        free(cur);              // 释放内存
    }
}
```

### 变种

| 类型 | 特点 | 优势 |
|---|---|---|
| **单链表** | 每个节点一个 next 指针 | 最简单，内存最小 |
| **双链表** | 每个节点 next + prev 指针 | 支持双向遍历，O(1) 删除给定节点 |
| **循环链表** | 尾节点 next 指回头节点 | 适合环形数据（如约瑟夫问题） |

## 性能数据（来自实机测试）

| 操作 | 规模 | 耗时 |
|---|---|---|
| 尾部插入 | 100,000 次 | 0.001 s |
| 头部插入 | 1,000 次 | 0.005 s |
| 按值查找 | 100,000 次 | 4.515 s |
| 按位查找 | 100,000 次 | ~0.000 s |

## 交叉引用

- [栈与队列](./stack-queue.md) — 基于这两种结构的受限线性表
- [复杂度速查](./complexity.md) — 各操作的理论时间/空间复杂度
