# Zeng Ge Assembler

[English](./doc/README-en.md)

> 注意：编译器只监视 `*.asm` 文件，并不是 `*.65s` 文件

## 所有编译器命令

1. [.BASE](#base)
2. [.ORG](#org)
3. [.DEF](#def)
4. [.ENUM .ENDE](#enum-ende)
5. [.DB .DW .DL](#db-dw-dl)
6. [.DBG .DWG .DLG .ENDD](#dbg-dwg-dlg-endd)
7. [.HEX](#hex)
8. [.IF .ELSEIF .ELSE .ENDIF](#if-elseif-else-endif)
9. [.IFDEF .IFNDEF .ELSE .ENDIF](#ifdef-ifndef-else-endif)
10. [.INCBIN](#incbin)
11. [.INCLUDE](#include)
12. [.MACRO .ENDM](#macro-endm)
13. [.REPEAT .ENDR](#repeat-endr)
14. [.MSG .ERROR](#msg-error)
---

## 配置文件

* [编译器插件地址](https://marketplace.visualstudio.com/items?itemName=ZENG-GE.zg-assembler)
* 或者可以在 VSCode 插件里搜索 `ZG Assembler` 即可找到插件
* 一个 [VSCode](https://code.visualstudio.com/) 的可扩展的编译器，目前支持 `6502` `65c816`(感谢Thirteen) `z80-gb`，将来会加入更多适应平台。
* 配置文件，当打开汇编文件会在目录下创建 `project-settings.json` 文件，默认以下配置
* 如果你想单独编译内核，请使用 `npm run build-core`，详情请查看 [内核单独编译方法](doc/内核单独编译方法.md)

```json
{
    "platform": "6502",            // 选择平台
    "intellisense": true,          // 是否开启智能提示
    "outOfRangeWarning": true,     // 编译结果越界警告
    "entry": "main.asm",           // 入口文件
    "compileTimes": 2,             // 编译次数，至少两次，否则会出错
    "outputEntryFile": "",         // 输出入口文件，不写则不输出
    "outputSingleFile": "",        // 单个文件输出，不写则不输出
    "copyToClipboard": true,       // 结果是否复制到剪贴板
    "includes": ["**/*.asm"],      // 项目包含的文件
    "excludes": []                 // 项目排除的文件
}
```

---

## 功能介绍

### 编译

* 在`asm`文件下的编辑器内，点击鼠标右键则会出现编译菜单。

---

### 标签

* 在这个版本增加了子标签的功能，可以使用例如 `player.x` `player.y` 这样的子标签，并且智能提示能更好的协助你。
* 按 vscode 的查找定义快捷键（默认F12）可直接找到标签定义位置。
* 编译器定义的 `xx = yy` 是作为变量，编译器将不会检查重复定义的变量。如要定义常量，请使用 `.DEF` 命令。

---

### 局部标签

* 若文件内使用标签（非编译器指令）以.（点）开头，则该标签的有效范围仅仅于本文件。
* 这样有利于可以在不同文件使用相同名称的标签。

---

### 简易标签

* 当标签以全部是+号或全部是-号的时候，则是简易标签。例如：

```
--      LDA $2002
        BPL --
        LDA $0
        BEQ +
        BPL ++
        JMP $9000
+       JMP $8000
++      JMP $A000
        ; AD 02 20 10 FB A5 00 F0 05 10 06 4C 00 90 4C 00 80 4C 00 A0 
```

---

### 运算符
> 注意：由于内核使用的是JS，所有运算符是以JS的运算符计算方法进行计算。例如： ~$A -> -11
```
	+ - * / & | ~ ^
	>> << && || !
	== != >= <=
```

---

### 特殊运算符

1. `>` 与 `<` 都有特殊的意义，例如 `>$1234` 即取高位 ($12)， `<$1234` 取低位 ($34)
2. `*` 有当不作为乘号时有特殊的意义，表示当前行的 `ORG` 地址
3. `$` 作为单独符号出现（即不为16进制标识符），表示当前行的 `BASE` 地址

### 字符串

有时候数据以字符串形式出现，例如 `.DB "HELLO WORLD"`

但是由于一些特殊限制，比如此字符串中的空格是十六进制 `00`，可以通过简单的变换，结果如下：

`.DB "HELLO\x00WORLD`

Unicode形式

`.DB "HELLO\u{00}WORLD"`

---

### 注释与折叠

* 当包含 `;` 字符，该行 `;` 之后所有内容都是注释
* 注释为 `;+` `;-` 则为折叠，方便折叠部分代码

---

## 编译器命令

> 以下命令内中括号为可选参数

---

<details>
<summary>.BASE</summary>

### `.BASE`

```
    .BASE 文件起始位置
```

* 设置生成文件地址，**默认为 `.BASE 0` **，这里不等同与 `.ORG`。
* 例如：若 `.BASE $10` ，则生成的文件编译内容从 `$10` 开始写入，之前的 `$F` 个地址为 `0`。

> 注意
> 1. 编译自上而下，一些第一次编译需要赋值的变量如果第一次编译未知则编译不成功。
> 2. 如果使用`.BASE`命令，则在`.ORG`之后，否则编译错误。

</details>

---

<details>
<summary>.ORG</summary>

### `.ORG`

```
    .ORG 编译起始位置
```

* 设置开始编译地址，例如：`.ORG $8000`，则编译将从$8000开始。
* 也可以使用`.ORG *`，表示从当前地址开始编译。不过要知道当前地址，否则编译器报错。
* 注意：如果使用 `.BASE` 命令，则在 `.ORG` 之后，否则编译错误。

</details>

---

<details>
<summary>.DEF</summary>

### `.DEF`

```
    .DEF 标签, 表达式
```

* 定义一个常量，例如：`.DEF idefined, $12`。

> 注意：`temp = $12` 虽然也能定义，用等号可重复定义。

</details>

---

<details>
<summary>.ENUM .ENDE</summary>

### `.ENUM` `.ENDE`

```
    .ENUM 起始地址
    标签, 字节长度
    ...
    .ENDE
```

* 定义一系列连续的地址，通常用于定义一系列内存地址
* 例如：

```
   .ENUM $300
   music.counter,  1    ; 类似 .DEF music.counter,  $300
   music.addrHigh, 2    ; 类似 .DEF music.addrHigh, $301 (music.counter + 1)
   music.addrLow,  3    ; 类似 .DEF music.addrLow,  $303 (music.addrHigh + 2)
   .ENDE
```

</details>

---

<details>
<summary>.DB .DW .DL</summary>

### `.DB` `.DW` `.DL`

```
    .DB 数据1 [, 数据2, 数据3...]    ;1字节
    .DW 数据1 [, 数据2, 数据3...]    ;2字节
    .DL 数据1 [, 数据2, 数据3...]    ;4字节
```

* 一系列数据。

</details>

---

<details>
<summary>.DBG .DWG .DLG .ENDD</summary>

### `.DBG` `.DWG` `.DLG` `.ENDD`

* 数据组，用于定位数据位置。

```
    .DWG 标签

    .data1, .data2, .data3, .data1

    .ENDD

    LDA data:.data1     ;0
    LDA data:.data3     ;2
    LDA data:.data1:1   ;3
```

</details>

-----

<details>
<summary>.HEX</summary>

### `.HEX`

```
    .HEX 16进制字符串
    .HEX 12 34567 89    ;12 34 56 07 89
```

* 一段16进制数据，可以用空格隔开。

> 注意：之后只能输入16进制数据，否则编译器会报错。

</details>

---

<details>
<summary>.IF .ELSEIF .ELSE .ENDIF</summary>

### `.IF` `.ELSEIF` `.ELSE` `.ENDIF`

* 这里是一套判断条件，根据条件是否成立是否编译相应内容。

> 注意：必须要在使用这些之前知道参数的信息，否则编译报错

```
    .IF a == 5
     .....
    .ELSEIF b >= 5
     .....
    .ELSEIF c != 3
     .....
    .ELSE
     .....
    .ENDIF
```

</details>

-----

<details>
<summary>.IFDEF .IFNDEF .ELSE .ENDIF</summary>

### `.IFDEF` `.IFNDEF` `.ELSE` `.ENDIF`

```
    .IFDEF 标签或自定义函数
     .....
    .ELSE
     .....
    .ENDIF
```

* 这里是一套判断条件，根据条件是否成立是否编译相应内容。
* 用法同 `.IF` 的命令类似，后面可以用 `.ELSE` `.ENDIF`
* 这里是判断变量或自定义函数是否存在，`.IFDEF`为判断变量或自定义函数存在，`.IFNDEF`为判断变量或自定义函数不存在。

> 注：必须要在使用这些之前知道参数的信息，否则编译报错

</details>

---

<details>
<summary>.INCBIN</summary>

### `.INCBIN`

```
    .INCBIN 文件相对路径[, 读取文件起始位置, 读取长度]
```

* 可以读取引用文件的二进制内容，后面双引号内请填写本文件的相对路径。

例如:
```
    .INCBIN "文件夹\文件.bin", 0, 100
```

</details>

-----

<details>
<summary>.INCLUDE</summary>

### `.INCLUDE`


```
    .INCLUDE 文件相对路径
```

* 可以引用文件，后面双引号内请填写本文件的相对路径。
* 如果引用文件内也有引用文件，请相对于主编译文件路径填写。

例如：
```
    .INCLUDE "文件夹\文件.asm"。
```

</details>

-----

<details>
<summary>.MACRO .ENDM</summary>

### `.MACRO` `.ENDM`

```
    .MACRO 自定义函数名称[, 参数1, 参数2...]
     .....
    .ENDM
```

> 注意：用这里的指令可以自定义函数，所要使用的函数要在编译之前定义好，否则编译器会报错。

> 注意：所有自定义函数内的 **标签** 属于 **局部变量**，请勿在函数外部使用。

> 注意：所有自定义函数内定义的 **变量** 均为 **全局变量**。

实例1：
```
    .MACRO TXY
    TXA
    TAY
    .ENDM

    TXY
```
* 编译之后结果为：`8A A8`

实例2：
```
    .MACRO test, a, b
    .IF 3 == a
    LDA 3
    .ELSEIF 4 == a
    LDX 4
    .ELSEIF 5 == a && 5 == b
    LDY 5
    .ELSE
    LDA 6
    STA 6
    .ENDIF
    .ENDM

    test 3,3
    test 4,3
    test 5,4
    test 5,5
```
* 编译之后结果为：`A5 03 A6 04 A5 06 85 06 A4 05`

</details>

-----

<details>
<summary>.REPEAT .ENDR</summary>

### `.REPEAT` `.ENDR`

```
    .REPEAT 重复次数
     .....
    .ENDR
```

* 可以重复某个指令多次，在 `.REPEAT` 后输入表达式即可。

> 注意：每个 `.REPEAT` 和 `.ENDR` 必须成对出现，可以嵌套。

```
    .REPEAT 2
    NOP
    .REPEAT 3
    ASL
    .ENDR
    .ENDR
```

* 对应编译的结果相当于：`NOP ASL ASL ASL NOP ASL ASL ASL`

</details>

-----

<details>
<summary>.MSG .ERROR</summary>

### `.MSG` `.ERROR`

```
    .MSG 输出信息[, 参数1, 参数2...]
    .ERROR 输出信息[, 参数1, 参数2...]
```

* MSG为可输出一条信息
* ERROR为输出一条信息并停止编译

```
    .ORG $8000
    .DEF test1, 10
    .DEF test2, 11
    .MSG "测试案例 {0}, ${1}, @{0}", test1, test2

    .IF test1 == 10
    .ERROR "这里的 test1: {0}", test1
    .ENDIF
```

* 这里输出的信息是：

> 测试案例 10, $B, @0000 1010
>
> 这里的 test1: 10

</details>
