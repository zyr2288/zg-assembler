# Zeng Ge Assembler

[简体中文](../README.md)

> Note: Only support `*.asm` files, not `*.65s` files.

## All assembly commands
1. [.BASE](#base)
2. [.ORG](#org)
3. [.DEF](#def)
4. [.DB .DW .DL](#db-dw-dl)
5. [.DBG .DWG .DLG .ENDD](#dbg-dwg-dlg-endd)
6. [.HEX](#hex)
7. [.IF .ELSEIF .ELSE .ENDIF](#if-elseif-else-endif)
8. [.IFDEF .IFNDEF .ELSE .ENDIF](#ifdef-ifndef-else-endif)
9. [.INCBIN](#incbin)
10. [.INCLUDE](#include)
11. [.MACRO .ENDM](#macro-endm)
12. [.REPEAT .ENDR](#repeat-endr)
13. [.MSG .ERROR](#msg)

* [ZG Assembler in Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ZENG-GE.zg-assembler)
* An extensible compiler for [VSCode](https://code.visualstudio.com/), supporting `6502` `65c816` (Special thanks Thirteen) `z80-gb`.
* When the assembly file is opened, a `project-settings.json` file is created in project directory.
* If you want to use core, use `npm run build-core` to build core source.

```json
{
    "platform": "6502",            // Target Platform
    "intellisense": true,
    "outOfRangeWarning": true,     // Compile result out-of-bounds warning
    "entry": "main.asm",
    "compileTimes": 2,
    "outputEntryFile": "",
    "outputSingleFile": "",
    "copyToClipboard": true,       // Copy result bytes to the clipboard
    "includes": ["**/*.asm"],
    "excludes": []
}
```

## Features

### Compile

* In the editor under `.asm` file, right click on the mouse and the compile menu will appear.


### Label

* You can use sub labels, such as `player.x` `player.y`.
* Press vscode's Find Definition shortcut key (default F12) to find the label definition location directly.
* All `xx = yy` is used as a variable, the compiler will not check for duplicate definitions. To define constants, use the `.DEF` command.

### Local label

* If a label is starting with "." (dot), then the label is valid only for this file.


### Folding

* The folding function starts with `;+` and ends with `;-`.


### Nameless label

* Labels are one or more '+' or '-' characters are nameless labels.
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

### Operator
> Note: operators are base Javascript operator. Exp: ~$A -> -11
```
	+ - * / & | ~ ^
	>> << && || !
	== != >= <=
```

### Special Operator

1. `>` and `<` have special meanings, for example `>$1234` takes the high ($12) and `<$1234` takes the low ($34).
2. `*` has a special meaning when not used as a multiplication sign, it means currect line original address. e.g. `.ORG *`.
3. `$` has a special meaning when not used as hex sign, it means currect line base address.

---

### Comments and folding

* When a `;` character is included, everything after `;` on the line is a comment.
* Comments of `;+` `;-` are collapsed to make it easier to collapse parts of the code.

---

## Compiler commands (example of 6502)

<details>
<summary>.BASE</summary>

### `.BASE`

```
    .BASE baseAddress
```

* Set the generated file address, the default is `.BASE 0`, it is not same as `.ORG`.
* For example, if `.BASE $10`, the generated file will be written from `$10`, and the previous `$F` address will be `0`.

> Note: 
> 1. Compile top-down, some variables need to be assigned for the first compile, if the first compile is unknown then compile is not successful.
> 2. If you use the `.BASE` command, after `.ORG`, otherwise it compiles incorrectly.

</details>

---

<details>
<summary>.ORG</summary>

### `.ORG`

```
    .ORG originalAddress
```

* Set the start compile address, e.g. `.ORG $8000`, then the compile will start at $8000.
* You can also use `.ORG *`, which means compilation will start from the current address. But the current address has to be known, otherwise the compiler reports an error.

> Note: If you use the `.BASE` command, after `.ORG`, otherwise it compiles with an error.

</details>

---

<details>
<summary>.DEF</summary>

### `.DEF`

```
    .DEF name, expression
```

* Define a constant, for example: `.DEF idefined, $12`

> Note: `temp = $12` can also be defined, but `temp` can be re-value.

</details>

---

<details>
<summary>.ENUM .ENDE</summary>

### `.ENUM` `.ENDE`

```
    .ENUM startAddress
    label, byteLength
    ...
    .ENDE
```

* Reassign PC and suppress assembly output. Useful for defining variables in RAM. 
* Example：

```
   .ENUM $300
   music.counter,  1    ; Same as .DEF music.counter,  $300
   music.addrHigh, 2    ; Same as .DEF music.addrHigh, $301 (music.counter + 1)
   music.addrLow,  3    ; Same as .DEF music.addrLow,  $303 (music.addrHigh + 2)
   .ENDE
```

</details>

---

<details>
<summary>.DB .DW .DL</summary>

### `.DB` `.DW` `.DL`

```
    .DB data1 [, data2, data3...]     ;1 byte
    .DW data1 [, data2, data3...]     ;2 bytes
    .DL data1 [, data2, data3...]     ;4 bytes
```

* A series of bytes data

</details>

---

<details>
<summary>.DBG .DWG .DLG .ENDD</summary>

### `.DBG` `.DWG` `.DLG` `.ENDD`

* Data group, get the data index.

For example:
```
    .DWG data

    .data1, .data2, .data3, .data1

    .ENDD

    LDA data:.data1     ;Result A5 00
    LDA data:.data3     ;Result A5 02
    LDA data:.data1:1   ;Result A5 03
```

</details>

---

<details>
<summary>.HEX</summary>

### `.HEX`

```
    .HEX hexString
```

* A hexadecimal string, can be separated by spaces.

For example:
```
    .HEX 12 34567 89     ;Result(Hex) 12 34 56 07 89
```

</details>

---

<details>
<summary>.IF .ELSEIF .ELSE .ENDIF</summary>

### `.IF` `.ELSEIF` `.ELSE` `.ENDIF`

* Process a block of code if an expression is true.

> Note: Must know the parameters value.

For example:
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

---

<details>
<summary>.IFDEF .IFNDEF .ELSE .ENDIF</summary>

### `.IFDEF` `.IFNDEF` `.ELSE` `.ENDIF`

```
    .IFDEF label
     .....
    .ELSE
     .....
    .ENDIF
```

* Process a block of code if a label has been defined / not defined.

</details>

---

<details>
<summary>.INCBIN</summary>

### `.INCBIN`

```
    .INCBIN filePath[, fileStartPosition, readLength]
```

* You can read the binary content of the reference file. Please fill in the relative path of the file in the double quotes.

For example:
```
    .INCBIN "Folder\file.bin", 0, 100
```

</details>

---

<details>
<summary>.INCLUDE</summary>

### `.INCLUDE`

```
    .INCLUDE filePath
```

* You can quote the file, please fill in the relative path of the file in double quotes. If there are also reference files in the reference file, please fill in relative to the main compilation file path. E.g:

```
    .INCLUDE "Folder\file.asm"
```

</details>

---

<details>
<summary>.MACRO .ENDM</summary>

### `.MACRO` `.ENDM`

```
    .MACRO macroName[, arg1, arg2...]
     .....
    .ENDM
```

* Define a macro. Macro arguments are comma separated.

> Note: Arguments shoud get the value at first compilation.

> Note: All labels in macro are local labels, please do not use them outside the macro.

For example:

```
    .MACRO name, param1, param2, param3... 
    ...
    .ENDM
```

Example 1:

```
    .MACRO TXY
    TXA
    TAY
    .ENDM

    TXY
```
* The compilation result:`8A A8`

Example 2:
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

* The compilation result:`A5 03 A6 04 A5 06 85 06 A4 05`

</details>

---

<details>
<summary>.REPEAT .ENDR</summary>

### `.REPEAT` `.ENDR`

```
    .REPEAT repeatTimes
     .....
    .ENDR
```

* Repeat a block of code a specified number of times.

For example:
```
    .REPEAT 2
    NOP
    .REPEAT 3
    ASL
    .ENDR
    .ENDR
```
* The compilation result is same as:`NOP ASL ASL ASL NOP ASL ASL ASL`

</details>

---

<details>
<summary>.MSG</summary>

### `.MSG` `.ERROR`

```
    .MSG message[, arg1, arg2...]
    .ERROR message[, arg1, arg2...]
```

* `MSG` - Out put a message.
* `ERROR` - Out put a message and stop

```
    .ORG $8000
    .DEF test1, 10
    .DEF test2, 11
    .MSG "test {0}, ${1}, @{0}", test1, test2

	.IF test1 == 10
    .ERROR "This is test1: {0}", test1
    .ENDIF
```

* The message is：

> test 10, $B, @0000 1010
> This is test1: 10

</details>
