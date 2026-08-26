# Debug接口说明

## 参数

主要文件是在 `src/LSP/DebugAdapter/DebugMessage.ts` 下，参照 `DebugMsgToEmu` 和 `DebugMsgFromEmu` 为发送或接收指令内容。

## 消息格式

发送的消息格式参照 Json-RPC 2.0 格式，具体可参考 [Json-RPC 2.0 规范](https://wiki.geekdream.com/Specification/json-rpc_2.0.html)

前4字节为该消息的长度，以 little-endian (小端序) 形式存储，之后为消息内容，消息内容为 Json 字符串的 UTF-8 编码格。

这样做的目的是保证数据粘连的时候，能够正确解析出每个消息的长度。