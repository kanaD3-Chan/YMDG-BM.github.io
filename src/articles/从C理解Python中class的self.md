---
title: 从C理解Python中class的self
icon: icon-park-solid:brain
category:
  - 文章
tag:
  - 杂谈
---


起因：上python课时似乎有人不懂python的self参数到底哪来的，有什么作用，于是就写这个了。

先看python。


```python
class Dog:
    def __init__(self, name="大狗"):
        self.name = name
    
    def name_dog(self, name):
        self.name = name
        
```

那这个self到底指的是什么？为什么实例方法必须要有至少一个参数？

self其实是一个约定俗成的名字，在python中，你给它起名叫self，叫this，叫apple叫cat都没问题。它指向的是当前实例。就比如

```python
big_dog = Dog()
puppy = Dog()

big_dog.name_dog("大狗") # self->big_dog
puppy.name_dog("修勾") # self->puppy
```

但还有一种直接通过类名访问实例方法来访问对象的方式。

```python
Dog.name_dog(big_dog, "大狗")
Dog.name_dog(puppy, "修勾")
```

看，这时，我们就必须补上第一个参数了，因为python不知道我们想给哪只狗改名字。

我们就用C模拟面向对象语言来看看就可以更明白一些。（是的，其实C可以玩面向对象，只是相比于python、Java、rust更简陋而已）注意：这里我没有加ref_count，因为并不打算真的去照着python写一整套系统，只是简单讲原理，所以写了一套最基本的完备对象。看代码：

```c
typedef struct Dog {
    const char *name;
} Dog;

static void Dog_name_dog(Dog *self, const char *name) {
    self->name = name;
}

Dog *Dog_new(void) {
    Dog *dog = malloc(sizeof(Dog));
    if (dog != NULL) dog->name = NULL; 
    return dog;
}

void Dog_init(Dog *self, const char *name) {
    self->name = name != NULL ? name : "大狗";
}

void Dog_drop(Dog **self) {
    if (self != NULL && *self != NULL) {
        free(*self);
        *self = NULL;
    }
}

```

我们定义了一个Dog结构体，对应到面向对象中它就是数据字段。因为C不像C++可以直接写一坨class来定义类方法、实例方法之类，所以在C中，我们约定这样一种类方法和实例方法的表达形式：`Classname_methodname(xxx)`。但C里没有方法，全是函数。我们这样起名，只是为了好区分。

但这样一写也挺明了，我们C代码这些与Dog相关的函数的样子，看起来好像也长得和python中Dog的方法差不多。我们都有一个self打头，以及一些别的可能的参数殿后。就比如`__init__(self, name="大狗")`之于`Dog_init(Dog *self, const char *name)`，`name_dog(self, name)`之于`Dog_name_dog(Dog *self, const char *name)`。

回到前面我们写的用通过类名访问实例方法给狗改名的情景

```python
Dog.name_dog(big_dog, "大狗")
Dog.name_dog(puppy, "修勾")
```

用我们的C函数就是这样的

```c
Dog *big_dog = Dog_new();
Dog *puppy = Dog_new();
Dog_init(big_dog, NULL);
Dog_init(puppy, NULL);
Dog_name_dog(big_dog, "大狗");
Dog_name_dog(puppy, "修勾");
```

看，Dog_name_dog的用法和python中类方法Dog.name_dog的用法几乎一模一样！但另一个问题紧随其后。

**我们平时是big_dog.name_dog("大狗")这样写的，第一个参数明明是"大狗"啊！**

因为很多面向对象语言都有类似的机制：通过实例访问实例方法时，会以某种方式让方法知道当前操作的是哪个实例。就像Java中的隐式this，python中约定俗成的显式self，以及 Rust 中通过不同接收者形式表达的self。

在python中，通过实例访问实例方法时，有一个绑定机制。python解释器会自动把调用的实例当作参数传给方法的第一个参数位置。换句话说，python已经替你写了`Dog.func_name(object_name, `这一部分，后面的内容就由你决定了。

所以，self并不是什么神秘的关键字。它只是一个用来接收当前实例的，一个有约定俗成名字的普通参数，而 Python 的方法绑定机制替你完成了实例传递。



### **顺带一提：那代码里的 `Dog_new` 和 `Dog_drop` 又是干嘛的？**

细心的人可能注意到了，我们在 C 语言里创建一只狗，是先调 `Dog_new()` 再调 `Dog_init()`：

```c
Dog *big_dog = Dog_new();   // 1. 负责在内存堆里找地方（malloc）
Dog_init(big_dog, NULL);    // 2. 负责给它的名字填上默认值
```

在 Python 里，很多人以为 `__init__` 就是“创建对象”，其实不是：
 - **`Dog_new` 对应的是 Python 的 `__new__`**：它负责真正造出这块内存（实例），拿到 `self` 指针；
 - **`Dog_init` 对应的是 Python 的 `__init__`**：它只负责拿造好的 `self`，往里填属性。

当你写 `big_dog = Dog()` 时，Python 实际上也是在幕后先跑了 `__new__` 圈地，再拿着圈好的地传给 `__init__` 去盖房子的。

至于最后的 `Dog_drop`，在 C 语言里你得手动 `free` 避免内存泄漏；而 Python 内部有引用计数和垃圾回收机制，会在没人用这只狗的时候，自动帮你调用类似 `Dog_drop` 的底层逻辑释放掉。
