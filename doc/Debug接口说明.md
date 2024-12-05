# Debug接口说明

## 参数

主要文件是在 `src/LSP/DebugAdapter/DebugClient.ts` 下，参照 `ReceiveDatas` 为发送或接收指令内容。

发送以及接收消息统一格式: **messageId;command;data**

(尽量少以非英文数字形式发送)

其中：

1. messageId是一个长度为8的数字字符串
2. command是命令，可以看以下type查看命令格式
3. data是以 data1=value,data2=value 的形式进行传输

## 热重载文件说明

点击热重载，会编译现有的入口文件并对比生成的文件二进制是否一致，然后对比不一致的地方输出一个文件，在工程目录下，文件格式为：

所有字节形式以 little-endian 形式存储

|字节说明|类型|
|---|---|
|文件起始地址|Uint32|
|修改数据长度|Uint32|
|修改的字节码|byte...|