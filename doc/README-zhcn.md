# Zeng Ge's Assembler

## 配置文件

一个可扩展的编译器，目前支持 `6502` `65816`(感谢Thirteen) `gbz80`，将来会加入更多适应平台。

配置文件，当打开汇编文件会在目录下的 `.vscode` 目录创建 `project-settings.json` 文件，默认以下配置
```json
{
    "platform": "6502",                 // 选择平台
    "intellisense": true,               // 是否开启智能提示
    "outOfRangeWarning": true,          // 编译结果越界警告
    "entry": "main.asm",                // 入口文件
    "compileTimes": 2,                  // 编译次数，至少两次，否则回出错
    "outputEntryFile": "",              // 输出入口文件，不写则不输出
    "outputSingleFile": "",             // 单个文件输出，不写则不输出
    "copyToClipboard": true,            // 结果是否复制到剪贴板
    "patchFile": "",                    // 匹配文件直接写入，建议备份原文件
    "includes": ["**/*.asm"],           // 包含的文件
    "excludes": []                      // 排除的文件
}
```
---
## 功能介绍

### 编译

在`asm`文件下的编辑器内，点击鼠标右键则会出现编译菜单。


### 标签

在这个版本增加了子标签的功能，可以使用例如 player.x player.y 这样的子标签，并且智能提示能更好的协助你。
按vscode的查找定义快捷键（默认F12）可直接找到标签定义位置。