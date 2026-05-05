---
title: 第二幕：链表
icon: material-symbols:power-outline
order: 1
category:
  - 数据结构
tag:
  - C/C++
  - 线性表
  - 链表
---

## 序

线性表的第二种物理实现——链表，放弃了物理相邻的奢求，转而用指针串联起离散的节点。这种“用空间换灵活性”的设计，让插入与删除不再受限于数据移动，却也付出了随机访问的代价。理解链表，就是理解指针在数据结构中的核心角色，也是我们迈向更复杂结构（如树、图）的重要阶梯，同时也常作为 malloc 等内存管理机制的底层实现，构筑起高效的内存分配机制。

这一幕，我们将一探链表的本质，弄清楚这个简洁的数据结构之下，指针是如何作为链子，链接起一个个离散的节点的。

## 链表的概念与结构

### 链表的定义与结构

链表是由多个离散的节点由指针串联而成的数据结构。与上一幕我们实现的顺序表不同，链表通常在内存中并不连续存储。

一个链表节点通常包含数据域与指针域。以单链表为例，它可以用C语言表示如下：
```C
typedef struct Node {
    int data;
    struct Node *next;
} Node;
```

### 链表的类型

按链接方式区分，链表可以分为单链表、双链表以及循环链表。其中双链表有prev与next两个节点，分别指向该节点的前一个节点与后一个节点；循环链表的首尾用指针相连。

同样地，链表也需要 **CRUD**[^first] 操作。一个基本的链表需要实现以下函数：
  - 创建链表
  - 增加节点
  - 修改节点内容
  - 删除节点
  - 查看节点内容
  - 销毁链表

## 链表的实现

接下来，我们将为前面定义的单链表实现上述操作。这里我们以学生管理系统为案例。

### 定义类型
```C
typedef struct {
  unsigned int id;
  char name[20];
  float score;
} Student;

typedef struct LListNode {
  Student student;

  struct LListNode *next;
} LListNode;
```

### 创建链表
```C
LListNode *createLList(Student data) {
  LListNode *student = (LListNode *)malloc(sizeof(LListNode));
  if (student == NULL)
    return NULL;
  student->student = data;
  student->next = NULL;
  return student;
}

```

### 增加节点

```C
void LListAddStudent(LListNode **students, Student data, unsigned int idx) {
  if (students == NULL)
    return;
  LListNode *newNode = (LListNode *)malloc(sizeof(LListNode));
  if (newNode == NULL)
    return;

  newNode->student = data;
  newNode->next = NULL;
  if (idx == 0) {
    newNode->next = *students;
    *students = newNode;
    return;
  }
  LListNode *prev = *students;

  for (size_t i = 1; i < idx && prev != NULL; ++i) {
    prev = prev->next;
  }

  if (prev == NULL) {
    free(newNode);
    newNode = NULL;
    return;
  }

  newNode->next = prev->next;
  prev->next = newNode;
}


```
### 删除节点

```C
void LListDeleteStudent(LListNode **students, unsigned int id) {
  if (students == NULL || *students == NULL)
    return;

  LListNode *prev = NULL;
  LListNode *curr = *students;

  while (curr != NULL && curr->student.id != id) {
    prev = curr;
    curr = curr->next;
  }

  if (curr == NULL)
    return;

  if (prev == NULL) {
    *students = curr->next;
  } else {
    prev->next = curr->next;
  }

  free(curr);
}
```


### 修改节点内容
```C
void LListModifyStudent(LListNode *students, unsigned int id, Student student) {
  if (students == NULL)
    return;

  while (students != NULL) {
    if (students->student.id == id) {
      students->student = student;
      return;
    }
    students = students->next;
  }
}

```

### 查询学生信息

```C
void LListShowStudent(LListNode *students, unsigned int id) {
  if (students == NULL)
    return;

  while (students != NULL) {
    if (students->student.id == id) {
      printf("student id: %u, name: %s, score: %f\n", students->student.id,
             students->student.name, students->student.score);
      return;
    }
    students = students->next;
  }
}


float LListlookUpScore(LListNode *students, unsigned int id) {
  LListNode *p = students;
  while (p != NULL) {
    if (p->student.id == id)
      return p->student.score;

    p = p->next;
  }
  return -1;
}
```



### 销毁链表
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

[^first]: 增删改查