# zg-assembler — VS Code 扩展快速上手

这是为 zg-assembler（一个支持 6502 / 65c816 / SM83-GB / SPC700 汇编的 VS Code 插件）准备的快速上手说明。本文档覆盖本地开发、调试、打包与发布的常用步骤，以及常见配置与示例。

---

## 特性概述
zg-assembler 提供以下主要功能：
- 语法高亮（6502 / 65c816 / SM83-GB / SPC700）
- 代码片段（常用伪指令 / 模板）
- 行内/工作区级别的配置支持

---

## 先决条件
- Node.js >= 16（根据你的 package.json 确认）
- npm 或 yarn
- VS Code（用于调试扩展）
- 推荐安装 `vsce`（用于打包和发布）：`npm install -g vsce`（可选）

---

## 本地运行（开发）
1. 克隆仓库并安装依赖：
   - git clone https://github.com/zyr2288/zg-assembler.git
   - cd zg-assembler
   - npm install

2. 编译 TypeScript（如果项目使用 TypeScript）：
   - npm run build
   - 或者在开发过程中使用 watch：`npm run watch`（若 package.json 中有定义）

3. 启动扩展调试：
   - 在 VS Code 中打开项目目录：`code .`
   - 进入 Run and Debug（运行和调试，快捷键 Ctrl+Shift+D）
   - 选择 “Launch Extension”（或扩展提供的调试配置），按 F5 启动扩展开发主机窗口（Extension Development Host）
   - 在开发主机中，打开或创建一个以支持的汇编后缀结尾的文件（例如 `.asm`、`.s`、或你在 `package.json` 中声明的语言关联），检查语法高亮与片段

4. 常用调试技巧：
   - 在扩展代码中设置断点（例如在 `activate`、命令处理器或语言服务启动处）
   - 使用 `console.log` 查看输出，或在调试控制台查看
   - 打开扩展开发主机的“输出”面板，选择扩展主进程对应的通道查看日志

---

## 使用示例
创建一个 6502 汇编示例文件 `example-6502.asm`：
```asm
; example-6502.asm
        ORG $8000
start:  LDA #$01
        STA $0200
        INX
        JMP start