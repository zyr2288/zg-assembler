# 更新日志

### 2026-03-24 v0.3.76

- 修复文件路径大小写可能造成的错误
- 修复无法读取文件绝对路径的问题
- 修复如果引用自身文件，会导致无限循环引用的问题
- 修复智能提示使用 `/` 时，会提示错误的问题
- 修复格式化错误的问题
- 修复 `.REPEAT` 命令的表达式高亮问题
- 修复缺少 `.ENDE` `.ENDM` 等命令的智能提示问题
- 添加若路径开头为 `@`，则是项目根目录下的文件路径

历史记录请查阅 ChangeLog-Full.md

[![Change Log](https://img.shields.io/badge/github-black?logo=github)](https://github.com/zyr2288/zg-assembler/blob/master/ChangeLog-History.md)
[![Change Log](https://img.shields.io/badge/gitee-red?logo=gitee)](https://gitee.com/zeng_ge/zg-assembler-next/tree/master/ChangeLog-History.md)