---
title: 第二幕：程序设计与算法复杂度
icon: material-symbols:power-outline
order: 2
category:
  - 数据结构
tag:
  - C/C++
  - 算法复杂度
---

## 序

算法是解决问题的方法，复杂度是给方法打分的那把尺子。同一个问题，解法可以差出几个数量级：有的人写循环逐项累加，有的人套公式一步出结果。数据量小的时候两者都没差，数据量一大，差距就是“眨眼”和“等到天黑”。

这一幕不做理论绕圈，直接用四个小问题把复杂度讲明白：求连续整数和、求素数个数、求阶乘和、求学生最高分。它们短，但足够看清 `O(1)`、`O(n)`、`O(n log log n)`、`O(n²)` 长什么样。

## 1~n 的连续整数和

最朴素的解法是一个循环：

```C
int sum_bf(int n) {
  int result = 0;
  for (int i = 1; i <= n; i++) {
    result += i;
  }
  return result;
}
```

循环执行 n 次，时间复杂度 `O(n)`。换成高斯公式，一步到位：

```C
unsigned long long int gaussian_sum(unsigned int n) {
  if (n <= 0) return 0;
  return (unsigned long long int)n * (n + 1) / 2;
}
```

无论 n 多大，都只做常数次运算，时间复杂度 `O(1)`。注意这里把 `n` 先转成 `unsigned long long` 再乘，否则 `n * (n + 1)` 在 `int` 里可能直接溢出。

## 1~n 的素数个数

朴素做法是对每个数判断是不是素数，判断本身要试除到 `√i`，整体 `O(n√n)`。换成埃拉托斯特尼筛法，一次筛完：

```C
int countPrimes(int n) {
  if (n < 2) return 0;
  bool *not_prime = (bool *)calloc(n + 1, sizeof(bool));
  if (not_prime == NULL) return -1;

  not_prime[0] = true;
  not_prime[1] = true;
  for (int i = 2; i <= (unsigned int)sqrt(n); i++) {
    if (!not_prime[i]) {
      for (long long j = (long long)i * i; j <= n; j += i) {
        not_prime[j] = true;
      }
    }
  }

  int count = 0;
  for (int i = 2; i <= n; i++) {
    if (!not_prime[i]) count++;
  }
  free(not_prime);
  return count;
}
```

几个容易踩的坑：

- `calloc` 会把内存清零，正好拿来当布尔数组，不用手动初始化。
- 内层循环从 `i * i` 开始：比 `i` 小的倍数，早在更小的素数那里被标记过了。
- 循环变量用 `long long`，`i * i` 在 `int` 范围边缘会溢出。
- 记得 `free`，筛完不释放就是内存泄漏。

埃氏筛的复杂度是 `O(n log log n)`，空间 `O(n)`，n 到千万级别依然跑得动。

## 1! + 2! + ... + n!

如果每个阶乘都单独算一遍，总复杂度是 `O(n²)`。更聪明的做法是“滚动”：`i!` 就是 `(i-1)! × i`，一边乘一边累加：

```C
unsigned long long int sum_factorial(unsigned int n) {
  if (n <= 0) return 0;
  unsigned long long int result = 0;
  unsigned long long int factorial = 1;
  for (size_t i = 1; i <= n; ++i) {
    factorial *= i;
    result += factorial;
  }
  return result;
}
```

一个循环搞定，时间复杂度 `O(n)`。阶乘长得飞快，`21!` 就已经超出 64 位无符号整数的范围了，所以这个函数也只能撑到 n=20 左右，再大就得换大数库。

## 求总成绩最高和最低的学生

有 10 个学生，每个学生有学号、姓名、三科成绩，要求输出总成绩最高和最低的学生姓名，用指针实现。

数据定义：

```C
typedef struct Student {
  unsigned int id;
  char name[32];
  float score[3];
  float total;
} Student;
```

要求“设计尽可能好的算法”，那就别排序。找最大值和最小值各扫一遍，或者一趟同时维护 `max` 和 `min` 两个指针：

```C
void findBestAndWorst(Student *students, int n,
                      Student **best, Student **worst) {
  *best = *worst = &students[0];
  for (int i = 1; i < n; i++) {
    if (students[i].total > (*best)->total) *best = &students[i];
    if (students[i].total < (*worst)->total) *worst = &students[i];
  }
}
```

一趟遍历 `O(n)` 就结束了。如果图省事把整个数组排序再取头尾，那是 `O(n log n)` 甚至 `O(n²)`，数据量一大纯属浪费——题目问的是“尽可能好”，不是“顺便排个序”。

## 小结

复杂度的本质是“数据规模变大时，运算量怎么跟着变”。`O(1)` 不随规模动，`O(n)` 线性涨，`O(n²)` 平方级爆炸。写代码前先问一句：数据最大能到多少？我的解法在极限数据下还活着吗？这两句话比背任何定义都管用。
