export const English = {
	"Unsupport platform {0}": "Unsupport platform \"{0}\"",
	"Label {0} not found": "Label \"{0}\" not found",
	"Can not use nameless label in Macro": "Can not use nameless label in Macro",
	"Label {0} illegal": "Label \"{0}\" illegal",
	"Label {0} is already defined": "Label \"{0}\" is already defined",
	"Unknow instruction {0}": "Unknow instruction \"{0}\"",
	"Instruction {0} do not support this addressing mode": "Instruction \"{0}\" do not support this addressing mode",
	"Command {0} Error": "Command \"{0}\" Error",
	"Expression error": "Expression error",
	"Macro arguments error": "Macro arguments error",
	"Command {0} do not support nesting": "Command \"{0}\" do not support nesting",
	"Command {0} can not use in Macro": "Command \"{0}\" can not use in Macro",
	"Unmatched command {0}": "Unmatched command \"{0}\"",
	"Command {0} can not use label": "Command \"{0}\" can not use label",
	"Command arguments error": "Command arguments error",
	"Unknow original address": "Unknow original address",
	"File {0} is not exist": "File \"{0}\" is not exist",
	"Argument out of range": "Argument out of range",
	"Expression result is {0}, but compile result is {1}": "Expression result is \"{0}\", but compile result is \"{1}\"",
	"Macro arguments count is {0}, but got {1}": "Macro arguments count is \"{0}\", but got \"{1}\"",
	"Data group {0} do not found": "Data group \"{0}\" do not found",

	"Unsupport string": "This expression do not support using string",

	"rename error": "Can not rename",
	"format error": "Can not format",

	"compiling": "compiling",
	"compile finished": "compile finished",
	"compile error": "compile error",
	"plugin loading": "plugin loading",
	"plugin loaded": "plugin loaded",

	"empty addressing mode": "(Empty)",
	"example": "Example:",
	"paramters": "All Paramters: ",

	"out put message File{0}, Line{1}, Message{2}": "File: \"{0}\"\nLine: {1}\n{2}\n\n",
	"baseOrgResult": "BASE:{0}  ORG:{1}  Result:{2}",

	"Please compile the file before Debug": "Please compile the file before Debug",
	"Debugger can not connect to the emulator": "Debugger can not connect to the emulator",
	"Cannot find launch.json": "Cannot find launch.json",
	"Cannot find rom file {0}": "Cannot find rom file {0}",
	"Cannot find program path {0}": "Cannot find program path {0}",
}

export const CommandTip_English = {
	def: { comment: "Define a constant.", format: ".DEF name, expression", exp: ".DEF PPU.CTRL_REG1, $2000" },
	macro: { comment: "Define a macro.", format: ".MACRO name[, arg0, arg1...]\n;Your code\n.ENDM", exp: ".MACRO TXY\nTXA\nTAY\n.ENDM" },
	org: {
		comment: "Set the starting address.\nNote：If you use the .BASE command, after .ORG, otherwise it compiles incorrectly.",
		format: ".ORG expression", exp: ".ORG $8000\n.ORG *\t;'*' means currect ORG address"
	},
	base: {
		comment: "Set the program address.\nNote：If you use the .BASE command, after .ORG, otherwise it compiles incorrectly.",
		format: ".BASE expression", exp: ".BASE $8000\n.BASE $\t;'$' means currect BASE address"
	},
	include: {
		comment: "Assemble source file.", format: ".INCLUDE \"filePath.asm\"",
		exp: ".INCLUDE \"../folder/file.asm\"\t;Relative path\n.INCLUDE \"D:/folder/file.asm\"\t;Absolute path"
	},
	incbin: {
		comment: "Add the contents of a file to the assembly output.", format: ".INCBIN \"file.bin\"[, fileStartPosition, readLength]",
		exp: ".INCBIN \"chr.bin\", 0, $1000"
	},
	db: { comment: "Emit bytes", format: ".DB arg0[, arg1, arg2...]" },
	dw: { comment: "Emit words", format: ".DB arg0[, arg1, arg2...]" },
	dl: { comment: "Emit four-bytes", format: ".DB arg0[, arg1, arg2...]" },
	if: { comment: "Confident branch", format: ".IF expression\n...\n.ELSEIF\n...\n.ELSE\n...\n.ENDIF" },
	ifdef: { comment: "If a label has been defined", format: ".IFDEF label\n...\n.ELSE\n...\n.ENDIF" },
	ifndef: { comment: "If a label has been not defined", format: ".IFNDEF label\n...\n.ELSE\n...\n.ENDIF" },
	hex: {
		comment: "Compact way of laying out a table of hex values.\n\nOnly raw hex values are allowed, no expressions.\n\nSpaces can be used to separate numbers.",
		format: ".HEX hex string",
		exp: ".HEX 456789ABCDEF\t;equivalent to .DB $45,$67,$89,$AB,$CD,$EF\n.HEX 0 1 23 4567\t;equivalent to .DB $00,$01,$23,$45,$67"
	},
	msg: {
		comment: "Out put a message. You can format value to binary, decimal or hexadecimal.", 
		format: ".MSG message[, arg0, arg1...]",
		exp: ".ORG $8000\n.MSG \"Now ORG address: {0}, @{0}, ${0}\", *\n\n;Now ORG address: 32768, @1000 0000 0000 0000, $8000"
	},
	error: {
		comment: "Out put a message and stop compile, you can format output message.", format: ".ERROR \"Your message\"[, arg0, arg1...]",
		exp: ".ERROR \"Compile error\"\n;Compile error",
	},
	enum: {
		comment: "Reassign PC and suppress assembly output.\n\nUseful for defining variables in RAM.", 
		format: ".ENUM startAddress\nlabelName, byteLength\n...\n.ENDE",
		exp: ".ENUM $300\n\tmusic.counter, 1\t; .DEF music.counter, $300\n\tmusic.addrHigh, 2\t; .DEF music.addrHigh, music.counter + 1 ($301)\n\tmusic.addrLow, 3\t; .DEF music.addrLow, music.addrHigh + 2 ($303)\n.ENDE"
	}
}