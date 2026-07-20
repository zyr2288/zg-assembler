# 更新日志

### 2026-07-20 v0.3.88

- 修复当插件激活时，使用别的脚本生成 `asm` 文件时候，所编辑的脚本会被修改的问题
- 新增 `.CHRMAP` `.STR` 命令，具体用法请参照 `README.md` 中的说明
- 添加 `ADD` `ADC` `SUB` `SBC` `AND` `XOR` `OR` `CP` 指令的寻址方式
- `.MACRO` 新增不定参数，具体用法请参照 `README.md` 中的说明
- 修复 `SM83-gb` 平台下的 `CALL` 指令的寻址方式问题
- 修复编译文件结果所展示的结果不正确的问题

历史记录请查阅 ChangeLog-History.md

[![Change Log](https://img.shields.io/badge/github-black?logo=github)](https://github.com/zyr2288/zg-assembler/blob/master/ChangeLog-History.md)
[![Change Log](https://img.shields.io/badge/gitee-red?logo=gitee)](https://gitee.com/zeng_ge/zg-assembler-next/tree/master/ChangeLog-History.md)