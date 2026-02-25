import { Expression, PriorityType } from "../Base/ExpressionUtils";
import { CommandTagBase } from "../Command/Command";
import { EnumTag } from "../Command/EnumCommand";
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

export class FormatHelper {

	static Format(filePath: string, options: { insertSpaces: boolean, tabSize: number }) {
		const lines: string[] = [];

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

		for (let i = 0; i < allLine.length; i++) {
			const line = allLine[i];
			if (!line || line.lineType === LineType.Error) {
				continue;
			}

			switch (line.key) {
				case "instruction":
					lines[i] = FormatHelper.FormatInstructionLine(line, tabOption);
					break;
				case "command":
					lines[i] = FormatHelper.FormatCommand(line, tabOption);
					break;
				case "macro":
					break;
				case "variable":
					lines[i] = FormatHelper.FormatVariable(line, tabOption);
					break;
				case "label":
					lines[i] = FormatHelper.GetDeepFormat(tabOption, false) + line.labelToken.text;
					break;
				case "unknow":
					break;
			}
		}

		return lines;
	}

	private static FormatInstructionLine(line: InstructionLine, option: FormatOption) {
		let result = FormatHelper.GetDeepFormat(option, false);

		if (line.label) {
			if (line.label.labelToken.length < option.tabSize) {
				if (option.insertSpaces) {
					result += line.label.labelToken.text + " ".repeat(option.tabSize - line.label.labelToken.length);
				} else {
					result += line.label.labelToken.text + "\t";
				}
			} else {
				result += line.label.labelToken.text;
				result += "\n" + FormatHelper.GetDeepFormat(option, true);
			}
		} else {
			result += option.tabFormat;
		}

		result += line.instruction.text.toUpperCase();

		if (line.expressions && line.expressions.length > 0) {
			result += " ";
			for (let i = 0; i < line.expressions.length; i++) {
				const exp = line.expressions[i];
				result += line.addressMode.addressingMode?.replace("[exp]", FormatHelper.FormatExpression(exp));
			}
		}

		return result;
	}

	private static FormatVariable(line: VariableLine, option: FormatOption) {
		let result = "";

		const comment = FormatHelper.GetComment(line.org.text);

		result += FormatHelper.GetDeepFormat(option, false);
		result += line.labelToken.text + " = ";

		result += FormatHelper.FormatExpression(line.expression);
		if (comment)
			result += comment;

		return result;
	}

	private static FormatCommand(line: CommandLine, option: FormatOption) {
		let result = "", tag;
		let comment = FormatHelper.GetComment(line.org.text);
		const command = line.command.text.toUpperCase();
		switch (command) {
			case ".ORG":
			case ".BASE":
				result += FormatHelper.GetDeepFormat(option, true);
				result += command;
				tag = line.tag as CommandTagBase;
				if (tag.exp)
					result += " " + FormatHelper.FormatExpression(tag.exp);

				break;
			case ".IF":
				result += FormatHelper.GetDeepFormat(option, true);
				result += command;
				option.deepSize++;
				break;
			case ".IFDEF":
			case ".IFNDEF":
				result += FormatHelper.GetDeepFormat(option, true);
				result += command + " ";
				result += line.org.text.substring(line.command.start + line.command.text.length).trim();
				option.deepSize++;
				break;
			case ".ENUM":
				result += FormatHelper.GetDeepFormat(option, true);
				result += command + "";
				tag = line.tag as EnumTag;
				if (tag.exp)
					result += " " + FormatHelper.FormatExpression(tag.exp);

				if (comment) {
					result += comment;
					comment = "";
				}

				for (let i = 0; i < tag.lines.length; i++) {
					const line = tag.lines[i];
					result += "\n" + FormatHelper.GetDeepFormat(option, true);
					result += enumItem.token.text;
					if (enumItem.exp)
						result += " " + FormatHelper.FormatExpression(enumItem.exp);
				}

				break;
			case ".ENDIF":
			case ".ELSE":
			case ".ENDR":
			case ".ENDM":
			case ".ENDE":
			case ".ENDD":
				result += FormatHelper.GetDeepFormat(option, false);
				result += command;
				option.deepSize--;
				break;
		}

		// if (line. && line.expressions.length > 0) {
		// 	result += " ";
		// 	for (let i = 0; i < line.expressions.length; i++) {
		// 		const exp = line.expressions[i];
		// 		result += FormatHelper.FormatExpression(exp);
		// 	}
		// }
		if (comment)
			result += comment;

		return result;
	}

	private static GetDeepFormat(option: { deepSize: number, tabFormat: string }, insertTab: boolean) {
		let result = option.tabFormat.repeat(option.deepSize);
		if (insertTab)
			result += option.tabFormat;

		return result;
	}

	//#region 格式化表达式
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

	//#region 检查行是否有注释
	/**
	 * 检查行是否有注释
	 * @param line 要检查的行
	 * @returns 注释的开始位置
	 */
	private static GetComment(line: string) {
		let result: string = "", inString = false;
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === "\"") {
				inString = !inString;
				continue;
			}

			if (inString)
				continue;

			switch (char) {
				case ";":
					break;
				case " ":
				case "\t":
					result += char;
					continue;
				default:
					result = "";
					continue;
			}

			result += line.substring(i);
			break;
		}
		return result.trimEnd();
	}
	//#endregion 检查行是否有注释

}