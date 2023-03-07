# Zeng Ge's Assembler

An assembler for `6502` `65816` `gb-z80`(Special thanks Thirteen).

When the assembly file is opened, the `project-settings.json` file is created in the `.vscode` directory.
```json
{
    "platform": "6502",
    "intellisense": true,
    "outOfRangeWarning": true,
    "entry": "main.asm",
    "compileTimes": 2,
    "outputEntryFile": "",
    "outputSingleFile": "",
    "copyToClipboard": true,
    "patchFile": "",               // It will rewrite patch file
    "includes": ["**/*.asm"],
    "excludes": []
}
```

## Features
### Compile
Click the right mouse button under the editor, “编译本文件” means "compile this file", “编译入口文件” means "compile entry file".

### Label
You can use sub labels, such as `player.x` `player.y`.
Press vscode's Find Definition shortcut key (default F12) to find the label definition location directly.

![sub labels](https://github.com/zyr2288/zg-assembler/blob/main/test/sub-label.gif)

### Local label
If a label is starting with "." (dot), then the label is valid only for this file.

### Folding
The folding function starts with `;+` and ends with `;-`.

![folding](https://github.com/zyr2288/zg-assembler/blob/main/test/folding.gif)

### Nameless label
Labels are one or more '+' or '-' characters are nameless labels.
For example:
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

## Compiler commands (example of 6502)
### `.BASE`
> Note: The compilation is from top to bottom. Some variables should be know for first compilation.

Set the generated file address. The default is `.BASE 0`, here is not the same as `.ORG`.

For example: If set `.BASE $10`, the file will write from `$10`.

> Note: If you use the `.BASE` command, after the `.ORG` command, otherwise the compilation will error.
---
### `.ORG`
Set the start compilation address, for example: `.ORG $8000`, the compilation will start from `$8000`. It can also be used to `.ORG *` start compilation from the current address. However, you must know the current address, otherwise the compiler will report an error.

> Note: If you use the `.BASE` command, after the `.ORG` command, otherwise the compilation will error.
---
### `.DEF`
Define a constant, for example: `.DEF idefined $12`
> Note: `temp = $12` can also be defined, but it can be repeated.
---
### `.DB`
Represents bytes. Multiple arguments are separated by commas. If the byte is greater than $ FF (255), the compiler will report an error.

For example:
```
    .DB $40, 40, @01010010, >address
```
---
### `.DW`
Represents double-byte, first low and then high. If the double byte is greater than $ FFFF (65535), the compiler will report an error.

For example:
```
    .DW $40, 60000, @01010101, address
```
---
### `.DL`
Represents four byte, same as `.DW`

---
### `.DBG` `.DWG` `.DLG`, `.ENDD`
Data group, get the data index.

For example:
```
    .DWG data

    .data1, .data2, .data3, .data1

    .ENDD

    LDA data:.data1     ;A5 00
    LDA data:.data3     ;A5 02
    LDA data:.data1:1   ;A5 03
```
---
### `.HEX`
Compact way of laying out a table of hex values. Only raw hex values are allowed, no expressions. Spaces can be used to separate numbers.

For example:
```
    .HEX 12 34567 89
```
The compilation result: `12 34 56 07 89`

---
### `.IF` `.ELSEIF` `.ELSE` `.ENDIF`
Process a block of code if an expression is true.

> Note: Must know the parameters value.

For example:
```
    .IF a == 5
    ...
    .ELSEIF b >= 5
    ...
    .ELSEIF c != 3
    ...
    .ELSE
    ...
    .ENDIF
```
---
### `.IFDEF` `.IFNDEF`
Process a block of code if a symbol has been defined / not defined.
--
### `.INCBIN`
You can read the binary content of the reference file. Please fill in the relative path of the file in the double quotes.

For example:
```
    .INCBIN "Folder\file.bin"
```
---
### `.INCLUDE`
You can quote the file, please fill in the relative path of the file in double quotes. If there are also reference files in the reference file, please fill in relative to the main compilation file path. E.g:
```
    .INCLUDE "Folder\file.asm"
```
---
### `.MACRO` `.ENDM`
Define a macro. Macro arguments are comma separated.

For example:
> Note： There is no limit to the number of parameters, and there can be no parameters. The parameters are separated by commas.
```
    .MACRO name param1, param2, param3... 
    ...
    .ENDM
```
Call the function: name param1, param2, param3...

Example 1:
```
    .MACRO TXY
    TXA
    TAY
    .ENDM

    TXY
```
The compilation result:`8A A8`

Example 2:
```
    .MACRO test a,b
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
The compilation result:`A5 03 A6 04 A5 06 85 06 A4 05`

---
### `.REPEAT` `.ENDR`
Repeat a block of code a specified number of times.

For example:
```
    .REPEAT 2
    NOP
    .REPEAT 3
    ASL
    .ENDR
    .ENDR
```
The compilation result is same as:`NOP ASL ASL ASL NOP ASL ASL ASL`

---