import { format } from "path";
import { LocalizationMsg, LocalizationTip } from "./Localization";

export const Chinese: LocalizationMsg = {
	"Unsupport platform {0}": "尚未支持的编译平台 \"{0}\"，请检查 \"project-setting.json\" 的编译平台",
	"Label {0} not found": "未找到标签 \"{0}\"",
	"Can not use nameless label in Macro": "不能在Macro函数内使用临时标签",
	"Label {0} illegal": "标签 \"{0}\" 命名有误",
	"Label {0} is already defined": "标签 \"{0}\" 重复",
	"Unknow instruction {0}": "未知的汇编指令 \"{0}\"",
	"Instruction {0} do not support this addressing mode": "汇编指令 \"{0}\" 不支持该寻址方式",
	"Command {0} Error": "命令 \"{0}\" 错误",
	"Expression error": "表达式错误",
	"Macro arguments error": "自定义函数参数错误",
	"Command {0} do not support nesting": "命令 \"{0}\" 不支持嵌套",
	"Command {0} can not use in Macro": "命令 \"{0}\" 不能使用在自定义函数内",
	"Unmatched command {0}": "找不到匹配的命令 \"{0}\"",
	"Command {0} can not use label": "命令 \"{0}\" 不支持标签",
	"Command arguments error": "命令参数错误",
	"Unknow original address": "未设定起始地址",
	"File {0} is not exist": "文件 \"{0}\" 不存在",
	"Argument out of range": "参数超出范围",
	"Expression result is {0}, but compile result is {1}": "表达式结果为 \"{0}\", 最终编译结果值为 \"{1}\"",
	"Macro arguments count is {0}, but got {1}": "自定义函数参数个数应该为 \"{0}\", 但目前参数个数为 \"{1}\"",
	"Data group {0} do not found": "数据组 \"{0}\" 未找到",

	"Unsupport string": "这个表达式不支持字符串",

	"rename error": "重命名错误",
	"format error": "格式化错误",

	"compiling": "编译中",
	"compile finished": "编译完成",
	"compile error": "编译错误",
	"plugin loading": "编译器插件载入中",
	"plugin loaded": "编译器插件载入完成",
	"plugin load error": "编译器载入失败",
	"finished": "完成",

	"empty addressing mode": "空",
	"example": "例子：",
	"paramters": "所有参数: ",

	"out put message File{0}, Line{1}, Message{2}": "文件: \"{0}\"\n第 {1} 行\n{2}\n\n",
	"baseOrgResult": "文件基址:{0}  编译地址:{1}  结果值:{2}",

	"Please compile the file before Debug": "请在Debug之前编译文件",
	"Debugger can not connect to the emulator": "调试器未能连接模拟器",
	"Connect to emulator...{0}": "正在连接模拟器 ... {0}",
	"Connected emulator": "已连接到模拟器",
	"Cannot find launch.json": "找不到 launch.json",
	"Cannot find rom file {0}": "找不到 rom {0}",
	"Cannot find program path {0}": "找不到启动程序 {0}",
	"Hot Reload Success": "热重载成功",

	"Global labels": "全局标签",
	"Local labels": "局部标签",
}

export const CommandTip_Chinese: LocalizationTip = {
	def: { comment: "定义一个常量。", format: ".DEF 名称, 表达式", exp: ".DEF PPU.CTRL_REG1, $2000" },
	macro: {
		comment: "定义一个宏。", format: ".MACRO 名称[, 参数0, 参数1...]\n;你的代码\n.ENDM",
		exp: ".MACRO TXY\n\tTXA\n\tTAY\n.ENDM"
	},
	org: {
		comment: "设定编译起始地址。\n注意：如果使用 .BASE 命令，则在 .ORG 之后，否则编译错误。", format: ".ORG 表达式",
		exp: ".ORG $8000\n.ORG *\t;'*'代表当前 ORG 地址"
	},
	base: {
		comment: "设定文件起始地址。\n注意：如果使用 .BASE 命令，则在 .ORG 之后，否则编译错误。", format: ".BASE 表达式",
		exp: ".BASE $0000\n.BASE $\t;'$'代表当前 BASE 地址"
	},
	include: {
		comment: "引用另一个汇编文件", format: ".INCLUDE \"文件.asm\"",
		exp: ".INCLUDE \"../文件夹/文件.asm\"\t;相对路径\n.INCLUDE \"D:/文件夹/文件.asm\"\t;绝对路径"
	},
	incbin: {
		comment: "编译文件的二进制到编译结果内，路径用法基本和 .INCLUDE 用法一致", format: ".INCBIN \"文件.bin\"[, 文件读取起始位置, 读取长度]",
		exp: ".INCBIN \"chr-rom.bin\", 0, $1000"
	},
	db: { comment: "单字节数据", format: ".DB 参数0[, 参数1, 参数2...]" },
	dw: { comment: "双字节数据", format: ".DW 参数0[, 参数1, 参数2...]" },
	dl: { comment: "四字节数据", format: ".DL 参数0[, 参数1, 参数2...]" },
	if: { comment: "宏判断条件", format: ".IF 表达式\n...\n.ELSEIF\n...\n.ELSE\n...\n.ENDIF" },
	ifdef: { comment: "判断标签或自定义函数已定义", format: ".IFDEF 标签名称或自定义函数\n...\n.ELSE\n...\n.ENDIF" },
	ifndef: { comment: "判断标签或自定义函数未定义", format: ".IFNDEF 标签名称或自定义函数\n...\n.ELSE\n...\n.ENDIF" },
	hex: {
		comment: "一段16进制数据，可以用空格隔开。",
		format: ".HEX 16进制字符",
		exp: ".HEX 456789ABCDEF\t;类似 .DB $45,$67,$89,$AB,$CD,$EF\n.HEX 0 1 23 4567\t;类似 .DB $00,$01,$23,$45,$67"
	},
	msg: {
		comment: "输出信息，你可以格式化输出数据，具体参考例子。", format: ".MSG \"你要输出的信息\"[, 参数0, 参数1...]",
		exp: ".ORG $8000\n.MSG \"当前编译地址: {0} @{0}, ${0}\", *\n;当前编译地址: 32768, @1000 0000 0000 0000, $8000"
	},
	error: {
		comment: "输出信息，同时停止编译，可以格式化输出数据。", format: ".ERROR \"你要输出的信息\"[, 参数0, 参数1...]",
		exp: ".ERROR \"编译有误\"\n;编译有误",
	},
	enum: {
		comment: "用于定义一连串的常量，一般用于定义连续的内存地址作为标记", format: ".ENUM 起始地址\n常量名称, 占用字节长度\n...\n.ENDE",
		exp: ".ENUM $300\n\tmusic.counter, 1\t; .DEF music.counter, $300\n\tmusic.addrHigh, 2\t; .DEF music.addrHigh, music.counter + 1 ($301)\n\tmusic.addrLow, 3\t; .DEF music.addrLow, music.addrHigh + 2 ($303)\n.ENDE"
	}
}