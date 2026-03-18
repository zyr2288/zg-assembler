import { Expression, PriorityType } from "../Base/ExpressionUtils";
import { Command, CommandTagBase } from "../Command/Command";
import { DataCommandTag } from "../Command/DataCommand";
import { DefTag } from "../Command/DefinedCommand";
import { EnumTag } from "../Command/EnumCommand";
import { HexTag } from "../Command/HexCommand";
import { IfConfidentTag } from "../Command/IfConfident";
import { Compiler } from "../Compiler/Compiler";
import { CommandLine } from "../Lines/CommandLine";
import { CommonLine, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { LabelLine } from "../Lines/LabelLine";
import { VariableLine } from "../Lines/VariableLine";

interface FormatOption {
	deepSize: number;
	insertSpaces: boolean;
	tabSize: number;
	tabFormat: string;
}

export class FormatHelper {

	//#region 格式化文件
	/**
	 * 格式化文件
	 * 
	 * 格式化的每一个函数必须返回单个 `InsertLine` 或者 `Map<number, InsertLine>`
	 * 
	 * 其中 `Map<number, InsertLine>` 的 key 为行号，value 为格式化后的行
	 * @param filePath 文件路径
	 * @param options 格式化选项
	 * @returns 
	 */
	static Format(filePath: string, options: { insertSpaces: boolean, tabSize: number }) {
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		const allLine = Compiler.enviroment.allLine.get(fileIndex);
		if (!allLine)
			return;

		const tabOption: FormatOption = {
			deepSize: 0,
			insertSpaces: options.insertSpaces,
			tabSize: options.tabSize,
			tabFormat: options.insertSpaces ? " ".repeat(options.tabSize) : "\t",
		};

		const formatParams = new FormatParams(allLine);
		const formatResult = new FormatResult();

		let temp;
		for (let i = 0; i < allLine.length; i++) {
			const line = allLine[i];
			if (!line || line.lineType === LineType.Error) {
				continue;
			}

			if ((line.lineType === LineType.Ignore || line.lineType === LineType.Finished) && line.key === "command") {
				const result = FormatHelper.FormatEndCommand(line, tabOption);
				if (result)
					formatResult.SetResult({ lineNumber: line.org.line, line: result });

				continue;
			}

			switch (line.key) {
				case "instruction":
					temp = FormatHelper.FormatInstructionLine(line, tabOption);
					formatResult.SetResult({ lineNumber: line.org.line, line: temp });
					break;
				case "command":
					temp = FormatHelper.FormatCommand(line, tabOption, formatParams);
					formatResult.SetResult(temp);
					break;
				case "macro":
					break;
				case "variable":
					temp = FormatHelper.FormatVariable(line, tabOption);
					formatResult.SetResult({ lineNumber: line.org.line, line: temp });
					break;
				case "label":
					temp = FormatHelper.FormatLabel(line, tabOption);
					formatResult.SetResult({ lineNumber: line.labelToken.line, line: temp });
					break;
				case "unknow":
					break;
			}

			if (formatParams.nextLineIndex >= 0) {
				i = formatParams.nextLineIndex;
				formatParams.nextLineIndex = -1;
			}
		}

		return formatResult.result;
	}
	//#endregion 格式化文件

	/***** 格式化行 *****/

	//#region 格式化指令行
	/**
	 * 格式化指令行
	 * @param line 指令行
	 * @param option 格式化选项
	 * @returns 
	 */
	private static FormatInstructionLine(line: InstructionLine, option: FormatOption): InsertLine {
		const insertLine = new InsertLine();
		FormatHelper.CheckLineHasLabel(line, option, insertLine);
		let temp = line.instruction.text.toUpperCase();
		if (line.expressions && line.expressions.length > 0) {
			temp += " ";
			for (let i = 0; i < line.expressions.length; i++) {
				const exp = line.expressions[i];
				if (line.addressMode.addressingMode)
					temp += line.addressMode.addressingMode.replace("[exp]", FormatHelper.FormatExpression(exp));
			}
		}

		insertLine.Append(temp);
		return insertLine;
	}
	//#endregion 格式化指令行

	//#region 格式化变量行
	/**
	 * 格式化变量行
	 * @param line 变量行
	 * @param option 格式化选项
	 * @returns 
	 */
	private static FormatVariable(line: VariableLine, option: FormatOption): InsertLine {
		const result = new InsertLine();
		result.Append(FormatHelper.GetDeepFormat(option, false));
		result.Append(line.labelToken.text + " = ");
		result.Append(FormatHelper.FormatExpression(line.expression));
		return result;
	}
	//#endregion 格式化变量行

	//#region 格式化命令行
	private static FormatCommand(line: CommandLine, option: FormatOption, formatParams: FormatParams): { lineNumber: number, line: InsertLine } | Map<number, InsertLine> | undefined {
		const command = line.command.text.toUpperCase();
		const cmd = Command.commandMap.get(command);
		if (!cmd)
			return;

		let tag;
		let resultLine: { lineNumber: number, line: InsertLine } | undefined = { lineNumber: 0, line: new InsertLine() };
		let resultMap: Map<number, InsertLine> | undefined;
		if (cmd.allowLabel && line.label)
			FormatHelper.CheckLineHasLabel(line, option, resultLine.line);

		switch (command) {
			case ".ORG":
			case ".BASE":
				resultLine.line = resultLine.line ?? new InsertLine();
				resultLine.line.Append(FormatHelper.GetDeepFormat(option, true) + command);
				tag = line.tag as CommandTagBase;
				if (tag.exp)
					resultLine.line.Append(" " + FormatHelper.FormatExpression(tag.exp));

				resultLine.lineNumber = line.org.line;
				break;
			case ".DEF":
				resultMap = FormatHelper.FormatCommandDef(line, option, formatParams);
				break;
			case ".HEX":
				resultLine.line = resultLine.line ?? new InsertLine();
				FormatHelper.FormatCommandHex(line, option, resultLine.line);
				resultLine.lineNumber = line.org.line;
				break;
			case ".DB":
			case ".DW":
			case ".DL":
				resultLine.line = resultLine.line ?? new InsertLine();
				FormatHelper.FormatCommandData(line, option, resultLine.line);
				resultLine.lineNumber = line.org.line;
				break;
			case ".IF":
				tag = line.tag as IfConfidentTag;
				if (!tag.exp) {
					resultLine = undefined;
					break;
				}

				resultLine.line = new InsertLine();
				resultLine.line.Append(FormatHelper.GetDeepFormat(option, true) + command + " ");
				resultLine.line.Append(FormatHelper.FormatExpression(tag.exp));
				option.deepSize++;
				resultLine.lineNumber = line.org.line;
				break;
			case ".IFDEF":
			case ".IFNDEF":
				resultLine.line = new InsertLine();
				resultLine.line.Append(command + " ");
				resultLine.line.Append(line.org.text.substring(line.command.start + line.command.text.length).trim());
				option.deepSize++;
				resultLine.lineNumber = line.org.line;
				break;
			case ".ENUM":
				resultMap = FormatHelper.FormatCommandEnum(line, option, formatParams);
				break;
			case ".ENDIF":
			case ".ELSE":
			case ".ENDR":
			case ".ENDM":
			case ".ENDD":
				resultLine.line = FormatHelper.CreateInsertLine(option);
				resultLine.lineNumber = line.org.line;
				break;
			case ".ENDE":
				console.error("出错了");
				break;
			default:
				resultLine = undefined;
				break;
		}

		return resultMap ?? resultLine;
	}

	//#endregion 格式化命令行

	//#region 格式化结束的命令行
	private static FormatEndCommand(line: CommandLine, option: FormatOption): InsertLine | undefined {
		const result = FormatHelper.CreateInsertLine(option);
		const command = line.command.text.toUpperCase();
		result.Append(command);
		switch (command) {
			case ".ENDE":
			case ".ENDIF":
			case ".ENDM":
				option.deepSize--;
				return result;
		}
		return;
	}
	//#endregion 格式化结束的命令行

	//#region 格式化标签行
	private static FormatLabel(line: LabelLine, option: FormatOption): InsertLine {
		const insertLine = new InsertLine();
		insertLine.Append(FormatHelper.GetDeepFormat(option, false));
		insertLine.Append(line.labelToken.text);
		return insertLine;
	}
	//#endregion 格式化标签行

	/***** 各种命令的格式化 *****/

	//#region 格式化 DEF 命令行
	private static FormatCommandDef(line: CommandLine, option: FormatOption, formatParams: FormatParams) {
		let tag = line.tag as DefTag;
		if (!tag.label || !tag.exp)
			return;

		const lines: { label: string, exp: string }[] = [];
		const result = new Map<number, InsertLine>();
		let maxLabelLength = tag.label.token.length;
		for (let i = line.org.line; i < formatParams.allLines.length; i++) {
			const line = formatParams.allLines[i];
			if (!line)
				continue;

			if (line.key !== "command" || line.command.text.toUpperCase() !== ".DEF")
				break;

			tag = line.tag as DefTag;
			if (!tag.label || !tag.exp)
				continue;

			maxLabelLength = Math.max(maxLabelLength, tag.label.token.length);
			lines[i] = {
				label: tag.label.token.text,
				exp: FormatHelper.FormatExpression(tag.exp)
			};
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line)
				continue;

			const insertLine = new InsertLine();
			insertLine.Append(FormatHelper.GetDeepFormat(option, true));
			insertLine.Append(".DEF ");
			insertLine.Append(FormatHelper.FillTabLength(line.label, line.exp, maxLabelLength, 6, option));
			result.set(i, insertLine);
		}
		formatParams.nextLineIndex = lines.length - 1;
		return result;
	}
	//#endregion 格式化 DEF 命令行

	//#region 格式化 ENUM 命令行
	private static FormatCommandEnum(line: CommandLine, option: FormatOption, formatParams: FormatParams) {
		const insertLine = FormatHelper.CreateInsertLine(option, true);
		insertLine.Append(".ENUM ");
		option.deepSize++;
		const tag = line.tag as EnumTag;

		const result = new Map<number, InsertLine>();
		if (tag.exp) {
			insertLine.Append(" " + FormatHelper.FormatExpression(tag.exp));
			result.set(line.org.line, insertLine);
		}

		let labelMaxLength = 0, startLine = 0;
		const lines: { label: string, exp: string }[] = [];
		if (tag.lines[0])
			startLine = tag.lines[0].labelToken.line;

		for (let i = 0; i < tag.lines.length; i++) {
			const line = tag.lines[i];
			if (!line)
				continue;

			labelMaxLength = Math.max(labelMaxLength, line.labelToken.text.length);

			lines[i] = {
				label: line.labelToken.text,
				exp: FormatHelper.FormatExpression(line.expression)
			};
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line)
				continue;

			// 因为Enum每一行最后都有一个逗号，所以需要在长度上加1
			const insertLine = new InsertLine();
			insertLine.Append(FormatHelper.GetDeepFormat(option, true));
			insertLine.Append(FormatHelper.FillTabLength(line.label, line.exp, labelMaxLength, 1, option));
			result.set(startLine + i, insertLine);
		}
		return result;
	}
	//#endregion 格式化 ENUM 命令行

	//#region 格式化 HEX 命令
	private static FormatCommandHex(line: CommandLine, option: FormatOption, insertLine: InsertLine): void {
		insertLine.Append(FormatHelper.GetDeepFormat(option, true));
		insertLine.Append(".HEX ");
		const tag = line.tag as HexTag;

		let result = "", temp;
		for (let i = 0; i < tag.length; i++) {
			const part = tag[i];
			if (!/^[0-9a-fA-F]+$/.test(part.text))
				return;

			for (let i = 0; i < part.text.length; i += 2) {
				temp = part.text.substring(i, i + 2);
				if (temp.length === 2) {
					result += temp + " ";
				} else {
					result += "0" + temp + " ";
				}
			}
		}
		insertLine.Append(result.substring(0, result.length - 1));
	}
	//#endregion 格式化 HEX 命令

	//#region 格式化 DB/DW/DL 命令行
	private static FormatCommandData(line: CommandLine, option: FormatOption, insertLine: InsertLine) {
		insertLine.Append(FormatHelper.GetDeepFormat(option, true));
		insertLine.Append(line.command.text.toUpperCase() + " ");

		const tag = line.tag as DataCommandTag;
		for (let i = 0; i < tag.length; i++) {
			const exp = tag[i];
			if (!exp)
				return;

			insertLine.Append(FormatHelper.FormatExpression(exp) + ", ");
		}

		insertLine.RemoveFromEnd(2);
	}
	//#endregion 格式化 IF 命令行

	/***** 辅助函数 *****/

	//#region 获取缩进格式
	/**
	 * 获取缩进格式
	 * @param option.deepSize 缩进深度
	 * @param option.tabFormat tab格式
	 * @param insertTab 是否插入tab
	 * @returns 
	 */
	private static GetDeepFormat(option: { deepSize: number, tabFormat: string }, insertTab: boolean) {
		let result = option.tabFormat.repeat(option.deepSize);
		if (insertTab)
			result += option.tabFormat;

		return result;
	}
	//#endregion 获取缩进格式

	//#region 格式化表达式
	/**
	 * 格式化表达式
	 * @param exp 表达式
	 * @returns 格式化好的字符串
	 */
	private static FormatExpression(exp: Expression) {
		let result = "";

		const temp: string[] = [];
		for (let i = 0; i < exp.parts.length; i++) {
			const part = exp.parts[i];
			temp[part.token.start] = part.token.text;
			switch (part.type) {
				case PriorityType.Level_0_Sure:
				case PriorityType.Level_1_Label:
				case PriorityType.Level_2_Address:
				case PriorityType.Level_5:
				case PriorityType.Level_4_Brackets:
					break;
				case PriorityType.Level_3_CharArray:
					temp[part.token.start] = "\"" + part.token.text + "\"";
					break;
				default:
					temp[part.token.start] = " " + temp[part.token.start] + " ";
					break;
			}
		}

		for (let i = 0; i < temp.length; i++) {
			if (!temp[i])
				continue;

			result += temp[i];
		}
		return result;
	}
	//#endregion 格式化表达式

	//#region 创建一个空白的InsertLine
	private static CreateInsertLine(option: FormatOption, insertTab = false): InsertLine {
		const insertLine = new InsertLine();
		insertLine.Append(FormatHelper.GetDeepFormat(option, insertTab));
		return insertLine;
	}
	//#endregion 创建一个空白的InsertLine

	//#region 检查命令行或指令行是否有标签
	/**
	 * 检查命令行或指令行是否有标签
	 * @param line 命令行或指令行
	 * @param result 插入行
	 * @param option 格式化选项
	 */
	private static CheckLineHasLabel(line: CommandLine | InstructionLine, option: FormatOption, insertLine: InsertLine) {
		insertLine.Append(FormatHelper.GetDeepFormat(option, false));
		if (line.label) {
			// 标签长度小于tabSize时，使用空白填充
			if (line.label.labelToken.length < option.tabSize) {
				if (option.insertSpaces) {
					insertLine.curLine += line.label.labelToken.text + " ".repeat(option.tabSize - line.label.labelToken.length);
				} else {
					insertLine.curLine += line.label.labelToken.text + "\t";
				}
			} else {
				insertLine.curLine += line.label.labelToken.text;
				insertLine.newLine = "";
			}
		} else {
			insertLine.curLine += option.tabFormat;
		}
	}
	//#endregion 检查命令行或指令行是否有标签

	//#region 计算需要多少Tab来对齐长度
	private static FillTabLength(label: string, exp: string, labelMaxLength: number, exStrLength: number, option: FormatOption) {
		// 标签长度必须是tabSize的整数倍，否则需要填充
		if (!option.insertSpaces) {
			labelMaxLength += exStrLength;
			if (labelMaxLength % option.tabSize === 0) {
				labelMaxLength += option.tabSize;
			} else {
				labelMaxLength += option.tabSize - labelMaxLength % option.tabSize;
			}
		}

		const restLength = labelMaxLength - (label.length + exStrLength);
		if (restLength <= 0) {
			if (option.insertSpaces)
				return `${label}, ${exp}`;
			else
				return `${label},\t${exp}`;
		}

		let result = label;
		if (option.insertSpaces) {
			// 使用空格填充
			result += "," + " ".repeat(restLength);
			return result + exp;
		} else {
			// 使用制表符填充
			const tabCount = Math.ceil(restLength / option.tabSize);
			result += "," + "\t".repeat(tabCount);
			return result + exp;
		}
	}
	//#endregion 计算需要多少Tab来对齐长度

}

class InsertLine {
	curLine: string = "";
	newLine?: string;

	Append(text: string | InsertLine) {
		if (text instanceof InsertLine) {
			text = text.curLine;
		}

		if (this.newLine !== undefined) {
			this.newLine += text;
			return;
		}

		this.curLine += text;
	}

	RemoveFromEnd(length: number) {
		if (this.newLine !== undefined) {
			this.newLine = this.newLine.substring(0, this.newLine.length - length);
			return;
		}

		this.curLine = this.curLine.substring(0, this.curLine.length - length);
	}
}

class FormatParams {
	nextLineIndex: number;
	allLines: CommonLine[];

	constructor(allLines: CommonLine[]) {
		this.nextLineIndex = -1;
		this.allLines = allLines;
	}
}

class FormatResult {
	result: Map<number, InsertLine> = new Map<number, InsertLine>();

	SetResult(data: { lineNumber: number, line: InsertLine } | Map<number, InsertLine> | undefined) {
		if (!data)
			return;

		if (data instanceof Map) {
			for (const [lineNumber, line] of data) {
				this.result.set(lineNumber, line);
			}
		} else {
			this.result.set(data.lineNumber, data.line);
		}
	}
}