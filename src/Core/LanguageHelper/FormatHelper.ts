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

class InsertLine {
	curLine: string = "";
	newLine?: string;

	Append(text:string) {
		if (this.newLine) {
			this.newLine += text;
		} else {
			this.newLine = text;
		}
	}
}

class FormatParams {
	nextLineIndex: number;
	allLines: CommonLine[];
	result: Map<number, InsertLine>;

	constructor(allLines: CommonLine[]) {
		this.nextLineIndex = -1;
		this.allLines = allLines;
		this.result = new Map<number, InsertLine>();
	}

	SetResult(lineNumber: number, line: InsertLine) {
		this.result.set(lineNumber, line);
	}
}

export class FormatHelper {

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
		for (let i = 0; i < allLine.length; i++) {
			const line = allLine[i];
			if (!line || line.lineType === LineType.Error) {
				continue;
			}

			if ((line.lineType === LineType.Ignore || line.lineType === LineType.Finished) && line.key === "command") {
				FormatHelper.FormatEndCommand(line, tabOption, formatParams);
				continue;
			}

			switch (line.key) {
				case "instruction":
					FormatHelper.FormatInstructionLine(line, tabOption, formatParams);
					break;
				case "command":
					FormatHelper.FormatCommand(line, tabOption, formatParams);
					break;
				case "macro":
					break;
				case "variable":
					FormatHelper.FormatVariable(line, tabOption, formatParams);
					break;
				case "label":
					FormatHelper.FormatLabel(line, tabOption, formatParams);
					break;
				case "unknow":
					break;
			}

			if (formatParams.nextLineIndex >= 0) {
				i = formatParams.nextLineIndex;
				formatParams.nextLineIndex = -1;
			}
		}

		return formatParams.result;
	}

	//#region 格式化指令行
	/**
	 * 格式化指令行
	 * @param line 指令行
	 * @param option 格式化选项
	 * @returns 
	 */
	private static FormatInstructionLine(line: InstructionLine, option: FormatOption, formatParams: FormatParams): void {
		const result: InsertLine = {
			curLine: FormatHelper.GetDeepFormat(option, false),
			newLine: undefined
		};

		FormatHelper.CheckLineHasLabel(line, result, option);
		let temp = line.instruction.text.toUpperCase();
		if (line.expressions && line.expressions.length > 0) {
			temp += " ";
			for (let i = 0; i < line.expressions.length; i++) {
				const exp = line.expressions[i];
				temp += line.addressMode.addressingMode?.replace("[exp]", FormatHelper.FormatExpression(exp));
			}
		}

		if (result.newLine) {
			result.newLine += temp;
		} else {
			result.curLine += temp;
		}

		formatParams.SetResult(line.org.line, result);
	}
	//#endregion 格式化指令行

	//#region 格式化变量行
	/**
	 * 格式化变量行
	 * @param line 变量行
	 * @param option 格式化选项
	 * @returns 
	 */
	private static FormatVariable(line: VariableLine, option: FormatOption, formatParams: FormatParams): void {
		const result: InsertLine = {
			curLine: FormatHelper.GetDeepFormat(option, false),
			newLine: undefined
		};
		result.curLine += line.labelToken.text + " = ";
		result.curLine += FormatHelper.FormatExpression(line.expression);
		formatParams.SetResult(line.org.line, result);
	}
	//#endregion 格式化变量行

	//#region 格式化命令行
	private static FormatCommand(line: CommandLine, option: FormatOption, formatParams: FormatParams) {
		const command = line.command.text.toUpperCase();
		const cmd = Command.commandMap.get(command);
		if (!cmd)
			return;

		let tag, curLine;
		if (cmd.allowLabel && line.label)
			FormatHelper.CheckLineHasLabel(line, option, formatParams);

		switch (command) {
			case ".ORG":
			case ".BASE":
				curLine = FormatHelper.GetDeepFormat(option, true) + command + " ";
				tag = line.tag as CommandTagBase;
				if (tag.exp)
					curLine += " " + FormatHelper.FormatExpression(tag.exp);

				break;
			case ".DEF":
				FormatHelper.FormatCommandDef(line, option, formatParams);
				break;
			case ".HEX":
				FormatHelper.FormatCommandHex(line, option);
				break;
			case ".DB":
			case ".DW":
			case ".DL":
				FormatHelper.FormatCommandData(line, option,formatParams);
				break;
			case ".IF":
				tag = line.tag as IfConfidentTag;
				if (!tag.exp) {
					tempResult = undefined;
					break;
				}

				curLine = FormatHelper.GetDeepFormat(option, true) + command + " ";
				curLine += FormatHelper.FormatExpression(tag.exp);
				option.deepSize++;
				break;
			case ".IFDEF":
			case ".IFNDEF":
				curLine = command + " ";
				curLine += line.org.text.substring(line.command.start + line.command.text.length).trim();
				option.deepSize++;
				break;
			case ".ENUM":
				FormatHelper.FormatCommandEnum(line, option, formatParams);
				break;
			case ".ENDIF":
			case ".ELSE":
			case ".ENDR":
			case ".ENDM":
			case ".ENDD":
				tempResult = FormatHelper.CreateInsertLine(option);
				
				break;
			case ".ENDE":
				console.error("出错了");
				break;
			default:
				tempResult = undefined;
				break;
		}

		return formatParams.result;
	}

	//#endregion 格式化命令行

	//#region 格式化结束的命令行
	private static FormatEndCommand(line: CommandLine, option: FormatOption, formatParams: FormatParams): void {
		const result = new InsertLine();
		result.Append(line.command.text.toUpperCase());
		switch (result.curLine) {
			case ".ENDE":
			case ".ENDIF":
			case ".ENDM":
				option.deepSize--;
				formatParams.SetResult(line.org.line, result);
				break;
		}
	}
	//#endregion 格式化结束的命令行

	//#region 格式化标签行
	private static FormatLabel(line: LabelLine, option: FormatOption, formatParams: FormatParams): void {
		const insertLine: InsertLine = {
			curLine: FormatHelper.GetDeepFormat(option, false) + line.labelToken.text
		}
		formatParams.SetResult(line.labelToken.line, insertLine);
	}
	//#endregion 格式化标签行

	/***** 各种命令的格式化 *****/

	//#region 格式化 DEF 命令行
	private static FormatCommandDef(line: CommandLine, option: FormatOption, formatParams: FormatParams) {
		let tag = line.tag as DefTag;
		if (!tag.label || !tag.exp)
			return;

		const lines: { label: string, exp: string }[] = [];
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

			const insertLine = {
				curLine: `${FormatHelper.GetDeepFormat(option, true)}.DEF ${FormatHelper.FillTabLength(line.label, line.exp, maxLabelLength, 6, option)}`
			};
			formatParams.result.set(i, insertLine);
		}

		formatParams.nextLineIndex = lines.length - 1;
	}
	//#endregion 格式化 DEF 命令行

	//#region 格式化 ENUM 命令行
	private static FormatCommandEnum(line: CommandLine, option: FormatOption, formatParams: FormatParams) {
		const tempResult = FormatHelper.CreateInsertLine(option, true);
		tempResult.curLine += ".ENUM ";
		option.deepSize++;
		const tag = line.tag as EnumTag;
		if (tag.exp) {
			tempResult.curLine += " " + FormatHelper.FormatExpression(tag.exp);
			formatParams.result.set(line.org.line, tempResult);
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
			const insertLine = {
				curLine: FormatHelper.GetDeepFormat(option, true) + FormatHelper.FillTabLength(line.label, line.exp, labelMaxLength, 1, option)
			};
			formatParams.result.set(startLine + i, insertLine);
		}
	}
	//#endregion 格式化 ENUM 命令行

	//#region 格式化 HEX 命令
	private static FormatCommandHex(line: CommandLine, option: FormatOption) {
		const tempResult = FormatHelper.CreateInsertLine(option, true);
		tempResult.curLine += ".HEX ";
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
		tempResult.curLine += result.substring(0, result.length - 1);
		return tempResult;
	}
	//#endregion 格式化 HEX 命令

	//#region 格式化 DB/DW/DL 命令行
	private static FormatCommandData(line: CommandLine, option: FormatOption, formatParams: FormatParams) {
		const tempResult = FormatHelper.CreateInsertLine(option, true);
		tempResult.curLine += line.command.text.toUpperCase() + " ";

		const tag = line.tag as DataCommandTag;
		for (let i = 0; i < tag.length; i++) {
			const exp = tag[i];
			if (!exp)
				return;

			tempResult.curLine += FormatHelper.FormatExpression(exp) + ", ";
		}
		return tempResult;
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
		const insertLine = FormatHelper.CreateInsertLine(option, false);
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
				insertLine.newLine = FormatHelper.GetDeepFormat(option, true);
			}
		} else {
			insertLine.curLine += option.tabFormat;
		}
		return insertLine;
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