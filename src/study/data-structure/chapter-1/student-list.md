---
title: 第三幕：实战——学生表
icon: material-symbols:power-outline
order: 3
category:
  - 数据结构
tag:
  - C/C++
  - 线性表
  - 实战
---

## 序

前两幕把顺序表和链表的操作一个个过了一遍，这一幕把它们组装起来解决一个实际问题：学生信息管理。用同一个“学生表”需求分别实现顺序表和单链表，做完你就会明白，为什么有些场景选数组，有些场景选链表。

需求如下：学生表包含学号、姓名、数据结构成绩，一共 10 个元素，要支持按学号排序、按学号查找成绩、插入后保持有序、按学号删除、修改成绩、输出单个/全部学生、销毁表。

## 顺序表版本

### 数据结构

```C
#define MAX_SIZE 64

typedef struct {
  unsigned int id;
  char name[20];
  float score;
} Student;

typedef struct SqList {
  Student data[MAX_SIZE];
  int length;
} SqList;
```

固定数组版顺序表，逻辑简单，但容量写死是 64，超过就塞不下。真实场景里一般会改成动态扩容（见第一幕）。

### 按学号排序

任务要求按学号升序，注意这里排序的字段是 `id`，不是成绩：

```C
void sortStudent(SqList *sqList) {
  for (int i = 0; i < sqList->length; i++) {
    int min_index = i;
    for (int j = i + 1; j < sqList->length; j++) {
      if (sqList->data[j].id < sqList->data[min_index].id) {
        min_index = j;
      }
    }
    if (min_index != i) {
      Student tmp = sqList->data[i];
      sqList->data[i] = sqList->data[min_index];
      sqList->data[min_index] = tmp;
    }
  }
}
```

::: note
我实验报告第一版在这里按 `score` 排了序，被题目要求背刺了——要求是“按照学号排序”。排序字段选错，后面所有“按学号有序”的操作前提就都不成立了，考试和写报告时先看清题目。
:::

### 插入、删除、查找、修改

插入的朴素做法是尾插后重新排序，数据量小没问题；讲究一点就找到插入位置，把后面的元素整体后移一格，保持 `O(n)` 且不重排：

```C
bool addStudentSorted(SqList *sqList, Student student) {
  if (sqList->length >= MAX_SIZE) return false;
  int i = sqList->length - 1;
  while (i >= 0 && sqList->data[i].id > student.id) {
    sqList->data[i + 1] = sqList->data[i];
    i--;
  }
  sqList->data[i + 1] = student;
  sqList->length++;
  return true;
}
```

删除用前移覆盖，用 `memmove` 而不是 `memcpy`：两个区间可能重叠，`memcpy` 的行为是未定义的。

```C
bool deleteStudent(SqList *sqList, unsigned int id) {
  for (int i = 0; i < sqList->length; i++) {
    if (sqList->data[i].id == id) {
      memmove(&sqList->data[i], &sqList->data[i + 1],
              (sqList->length - i - 1) * sizeof(Student));
      sqList->length--;
      return true;
    }
  }
  return false;
}
```

查找、修改、输出都是线性遍历，`O(n)`。顺序表是动态分配的（这里简化成结构体里的固定数组），销毁时 `free` 后记得把指针置 `NULL`。

## 单链表版本

### 数据结构

```C
typedef struct LListNode {
  Student student;
  struct LListNode *next;
} LListNode;
```

链表的核心操作都要注意：**需要修改头指针的函数，参数必须用二级指针** `LListNode **`。

### 插入

支持头插、尾插、中间插：

```C
void LListAddStudent(LListNode **students, Student data, unsigned int idx) {
  LListNode *newNode = (LListNode *)malloc(sizeof(LListNode));
  newNode->student = data;
  newNode->next = NULL;

  if (idx == 0) {              // 头插：改头指针
    newNode->next = *students;
    *students = newNode;
    return;
  }

  LListNode *prev = *students;
  for (unsigned int i = 1; i < idx && prev != NULL; i++) {
    prev = prev->next;
  }
  if (prev == NULL) {          // 索引越界
    free(newNode);
    return;
  }
  newNode->next = prev->next;
  prev->next = newNode;
}
```

### 按学号删除

双指针（`prev` / `curr`）遍历，找到后改前驱的 `next`：

```C
void LListDeleteStudent(LListNode **students, unsigned int id) {
  LListNode *prev = NULL;
  LListNode *curr = *students;
  while (curr != NULL && curr->student.id != id) {
    prev = curr;
    curr = curr->next;
  }
  if (curr == NULL) return;
  if (prev == NULL) *students = curr->next;   // 删的是头结点
  else prev->next = curr->next;
  free(curr);
}
```

### 排序与销毁

链表排序用选择排序时，可以直接交换节点里的数据，省去复杂的指针重排；节点多时也可以交换 `next` 指针，但代码量和出错概率都上去了。销毁必须逐个节点 `free`，先把 `next` 存下来再释放当前节点，否则就丢了链表：

```C
void LListDrop(LListNode *students) {
  LListNode *curr = students;
  while (curr != NULL) {
    LListNode *next = curr->next;
    free(curr);
    curr = next;
  }
}
```

## 顺序表还是链表？

| 操作 | 顺序表 | 单链表 |
|------|--------|--------|
| 按学号随机查找 | `O(1)` 定位，遍历 `O(n)` | 只能遍历 `O(n)` |
| 尾部插入/删除 | `O(1)` | 无尾指针时 `O(n)` |
| 中间插入/删除 | 移动元素 `O(n)` | 找位置 `O(n)`，改指针 `O(1)` |
| 空间 | 连续一整块，可能浪费 | 按节点分配，有指针开销 |

数据规模小、操作随意，怎么选都行；数据量大且经常按位置随机访问，选顺序表；频繁在中间插入删除，选链表。实验里两个都写一遍，体会的就是这种取舍。
