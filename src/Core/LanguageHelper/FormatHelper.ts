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
import { VariableLine } from "../Lines/VariableLine";

interface InsertLine {
	curLine: string;
	newLine?: string;
}

interface FormatOption {
	deepSize: number;
	insertSpaces: boolean;
	tabSize: number;
	tabFormat: string;
	nextLineIndex: number;
	allLines: CommonLine[];
	result: Map<number, InsertLine>;
}

export class FormatHelper {

	static Format(filePath: string, options: { insertSpaces: boolean, tabSize: number }) {
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		const allLine = Compiler.enviroment.allLine.get(fileIndex);
		if (!allLine)
			return;

		const tabOption: FormatOption = {
			deepSize: 0,
			nextLineIndex: -1,
			allLines: allLine,
			insertSpaces: options.insertSpaces,
			tabSize: options.tabSize,
			tabFormat: options.insertSpaces ? " ".repeat(options.tabSize) : "\t",
			result: new Map<number, InsertLine>(),
		};

		for (let i = 0; i < allLine.length; i++) {
			const line = allLine[i];
			if (!line || line.lineType === LineType.Error) {
				continue;
			}

			if ((line.lineType === LineType.Ignore || line.lineType === LineType.Finished) && line.key === "command") {
				FormatHelper.FormatEndCommand(line, tabOption);
				continue;
			}

			switch (line.key) {
				case "instruction":
					FormatHelper.FormatInstructionLine(line, tabOption);
					break;
				case "command":
					FormatHelper.FormatCommand(line, tabOption);
					break;
				case "macro":
					break;
				case "variable":
					FormatHelper.FormatVariable(line, tabOption);
					break;
				case "label":
					tabOption.result.set(
						line.labelToken.line,
						{ curLine: FormatHelper.GetDeepFormat(tabOption, false) + line.labelToken.text }
					);
					break;
				case "unknow":
					break;
			}

			if (tabOption.nextLineIndex >= 0) {
				i = tabOption.nextLineIndex;
				tabOption.nextLineIndex = -1;
			}
		}

		return tabOption.result;
	}

	//#region 格式化指令行
	/**
	 * 格式化指令行
	 * @param line 指令行
	 * @param option 格式化选项
	 * @returns 
	 */
	private static FormatInstructionLine(line: InstructionLine, option: FormatOption) {
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

		option.result.set(line.org.line, result);
	}
	//#endregion 格式化指令行

	//#region 格式化变量行
	/**
	 * 格式化变量行
	 * @param line 变量行
	 * @param option 格式化选项
	 * @returns 
	 */
	private static FormatVariable(line: VariableLine, option: FormatOption) {
		const result: InsertLine = { curLine: FormatHelper.GetDeepFormat(option, false), newLine: undefined };
		result.curLine += line.labelToken.text + " = ";
		result.curLine += FormatHelper.FormatExpression(line.expression);
		option.result.set(line.org.line, result);
	}
	//#endregion 格式化变量行

	//#region 格式化命令行
	private static FormatCommand(line: CommandLine, option: FormatOption) {
		const command = line.command.text.toUpperCase();
		const cmd = Command.commandMap.get(command);
		if (!cmd)
			return;

		let tempResult: InsertLine | undefined = FormatHelper.CreateInsertLine(option, false);
		let tag, curLine;
		if (cmd.allowLabel && line.label)
			FormatHelper.CheckLineHasLabel(line, tempResult, option);

		switch (command) {
			case ".ORG":
			case ".BASE":
				curLine = FormatHelper.GetDeepFormat(option, true) + command + " ";
				tag = line.tag as CommandTagBase;
				if (tag.exp)
					curLine += " " + FormatHelper.FormatExpression(tag.exp);

				break;
			case ".DEF":
				FormatHelper.FormatCommandDef(line, option);
				break;
			case ".HEX":
				FormatHelper.FormatCommandHex(line, option);
				break;
			case ".DB":
			case ".DW":
			case ".DL":
				FormatHelper.FormatCommandData(line, option);
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
				FormatHelper.FormatCommandEnum(line, option);
				break;
			case ".ENDIF":
			case ".ELSE":
			case ".ENDR":
			case ".ENDM":
			case ".ENDD":
				tempResult = FormatHelper.CreateInsertLine(option);
				tempResult.curLine += command;
				break;
			case ".ENDE":
				console.error("出错了");
				break;
			default:
				tempResult = undefined;
				break;
		}

		if (tempResult && curLine) {
			if (tempResult?.newLine)
				tempResult.newLine += curLine;
			else
				tempResult.curLine += curLine;
		}

		if (tempResult)
			option.result.set(line.org.line, tempResult);

		return option.result;
	}

	//#endregion 格式化命令行

	//#region 格式化结束的命令行
	private static FormatEndCommand(line: CommandLine, option: FormatOption) {
		const command = line.command.text.toUpperCase();
		switch (command) {
			case ".ENDE":
			case ".ENDIF":
			case ".ENDM":
				option.deepSize--;
				const result = FormatHelper.CreateInsertLine(option, true);
				result.curLine += command;
				option.result.set(line.org.line, result);
				break;
		}
	}
	//#endregion 格式化结束的命令行

	/***** 各种命令的格式化 *****/

	//#region 格式化 DEF 命令行
	private static FormatCommandDef(line: CommandLine, option: FormatOption) {
		let tag = line.tag as DefTag;
		if (!tag.label || !tag.exp)
			return;

		const lines: { label: string, exp: string }[] = [];
		let maxLabelLength = tag.label.token.length;
		for (let i = line.org.line; i < option.allLines.length; i++) {
			const line = option.allLines[i];
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
			option.result.set(i, insertLine);
		}

		option.nextLineIndex = lines.length - 1;
		return option.result;
	}
	//#endregion 格式化 DEF 命令行

	//#region 格式化 ENUM 命令行
	private static FormatCommandEnum(line: CommandLine, option: FormatOption) {
		let tempResult = FormatHelper.CreateInsertLine(option, true);
		tempResult.curLine += ".ENUM ";
		option.deepSize++;
		const tag = line.tag as EnumTag;
		if (tag.exp) {
			tempResult.curLine += " " + FormatHelper.FormatExpression(tag.exp);
			option.result.set(line.org.line, tempResult);
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
			option.result.set(startLine + i, insertLine);
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
		option.result.set(line.org.line, tempResult);
	}
	//#endregion 格式化 HEX 命令

	//#region 格式化 DB/DW/DL 命令行
	private static FormatCommandData(line: CommandLine, option: FormatOption) {

		const tempResult = FormatHelper.CreateInsertLine(option, true);
		tempResult.curLine += line.command.text.toUpperCase() + " ";

		const tag = line.tag as DataCommandTag;
		for (let i = 0; i < tag.length; i++) {
			const exp = tag[i];
			if (!exp)
				return;

			tempResult.curLine += FormatHelper.FormatExpression(exp) + ", ";
		}
		option.result.set(line.org.line, tempResult);
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
	private static CreateInsertLine(option: FormatOption, insertTab = false) {
		return { curLine: FormatHelper.GetDeepFormat(option, insertTab), newLine: undefined as string | undefined };
	}
	//#endregion 创建一个空白的InsertLine

	//#region 检查命令行或指令行是否有标签
	/**
	 * 检查命令行或指令行是否有标签
	 * @param line 命令行或指令行
	 * @param result 插入行
	 * @param option 格式化选项
	 */
	private static CheckLineHasLabel(line: CommandLine | InstructionLine, result: InsertLine, option: FormatOption) {
		if (line.label) {
			// 标签长度小于tabSize时，使用空白填充
			if (line.label.labelToken.length < option.tabSize) {
				if (option.insertSpaces) {
					result.curLine += line.label.labelToken.text + " ".repeat(option.tabSize - line.label.labelToken.length);
				} else {
					result.curLine += line.label.labelToken.text + "\t";
				}
			} else {
				result.curLine += line.label.labelToken.text;
				result.newLine = FormatHelper.GetDeepFormat(option, true);
			}
		} else {
			result.curLine += option.tabFormat;
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