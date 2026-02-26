import { Expression, PriorityType } from "../Base/ExpressionUtils";
import { CommandTagBase } from "../Command/Command";
import { EnumTag } from "../Command/EnumCommand";
import { IfConfidentTag } from "../Command/IfConfident";
import { Compiler } from "../Compiler/Compiler";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { VariableLine } from "../Lines/VariableLine";

interface FormatOption {
	deepSize: number;
	insertSpaces: boolean;
	tabSize: number;
	tabFormat: string;
}

interface InsertLine {
	curLine: string;
	newLine?: string;
}

export class FormatHelper {

	static Format(filePath: string, options: { insertSpaces: boolean, tabSize: number }) {
		const lines = new Map<number, InsertLine>();

		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		const allLine = Compiler.enviroment.allLine.get(fileIndex);
		if (!allLine)
			return lines;

		const tabOption: FormatOption = {
			deepSize: 0,
			insertSpaces: options.insertSpaces,
			tabSize: options.tabSize,
			tabFormat: options.insertSpaces ? " ".repeat(options.tabSize) : "\t"
		};

		let temp = undefined;
		for (let i = 0; i < allLine.length; i++) {
			const line = allLine[i];
			if (!line || line.lineType === LineType.Error || line.lineType === LineType.Ignore) {
				continue;
			}

			switch (line.key) {
				case "instruction":
					temp = FormatHelper.FormatInstructionLine(line, tabOption);
					break;
				case "command":
					temp = FormatHelper.FormatCommand(line, tabOption);
					break;
				case "macro":
					break;
				case "variable":
					temp = FormatHelper.FormatVariable(line, tabOption);
					break;
				case "label":
					temp = { curLine: FormatHelper.GetDeepFormat(tabOption, false) + line.labelToken.text };
					break;
				case "unknow":
					break;
			}

			if (temp) {
				lines.set(i, temp);
				temp = undefined;
			}
		}

		return lines;
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

		return result;
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
		return result;
	}
	//#endregion 格式化变量行

	//#region 格式化命令行
	private static FormatCommand(line: CommandLine, option: FormatOption) {
		let result: InsertLine | undefined = FormatHelper.CreateInsertLine(option);
		const command = line.command.text.toUpperCase();

		let tag;
		switch (command) {
			case ".ORG":
			case ".BASE":
				result = FormatHelper.CreateInsertLine(option, true);
				result.curLine += command;
				tag = line.tag as CommandTagBase;
				if (tag.exp)
					result.curLine += " " + FormatHelper.FormatExpression(tag.exp);

				break;
			case ".IF":
				tag = line.tag as IfConfidentTag;
				if (!tag.exp) {
					result = undefined;
					break;
				}

				result = FormatHelper.CreateInsertLine(option, true);
				result.curLine += command + " ";
				result.curLine += FormatHelper.FormatExpression(tag.exp);
				option.deepSize++;
				break;
			case ".IFDEF":
			case ".IFNDEF":
				result = FormatHelper.CreateInsertLine(option, true);
				result.curLine += command + " ";
				result.curLine += line.org.text.substring(line.command.start + line.command.text.length).trim();
				option.deepSize++;
				break;
			case ".ENUM":
				result = FormatHelper.CreateInsertLine(option, true);
				result.curLine += command + "";
				tag = line.tag as EnumTag;
				if (tag.exp)
					result.curLine += " " + FormatHelper.FormatExpression(tag.exp);

				let maxTabLength = 0;
				const lines = new Map<number, { label: string, exp: string }>();
				for (let i = 0; i < tag.lines.length; i++) {
					const line = tag.lines[i];
					if (!line) {
						continue;
					}

					if (line.labelToken.text.length > maxTabLength)
						maxTabLength = line.labelToken.text.length;

					lines.set(line.labelToken.line, {
						label: line.labelToken.text,
						exp: FormatHelper.FormatExpression(line.expression)
					});
				}

				for(const [lineNum, line] of lines) {
					result.curLine += FormatHelper.FormatLabel(line.label, maxTabLength, option);
					result.curLine += line.exp;
					result.newLine += line.exp;
				}
				break;
			case ".ENDIF":
			case ".ELSE":
			case ".ENDR":
			case ".ENDM":
			case ".ENDE":
			case ".ENDD":
				result = FormatHelper.CreateInsertLine(option);
				result.curLine += command;
				option.deepSize--;
				break;
			default:
				result = undefined;
				break;
		}

		// if (line. && line.expressions.length > 0) {
		// 	result += " ";
		// 	for (let i = 0; i < line.expressions.length; i++) {
		// 		const exp = line.expressions[i];
		// 		result += FormatHelper.FormatExpression(exp);
		// 	}
		// }

		return result;
	}
	//#endregion 格式化命令行

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
		return { curLine: FormatHelper.GetDeepFormat(option, insertTab), newLine: undefined }
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
	private static FillTabLength(label: string, exp: string, labelMaxLength: number, option: FormatOption) {
		const fillLength = labelMaxLength - label.length;

		if (fillLength <= 0) {
			if (option.insertSpaces)
				return `${label}, ${exp}`;
			else
				return `${label},\t${exp}`;
		}

		let result = label;
		if (option.insertSpaces) {
			// 使用空格填充
			result += " ".repeat(fillLength);
			return `${result}, ${exp}`;
		} else {
			// 使用制表符填充
			const tabCount = Math.ceil(fillLength / option.tabSize);
			result += "\t".repeat(tabCount);
			return `${result},\t${exp}`;
		}
	}
	//#endregion 计算需要多少Tab来对齐长度

}