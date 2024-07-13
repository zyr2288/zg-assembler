import { Expression, ExpressionUtils, PriorityType } from "../Base/ExpressionUtils";
import { Macro } from "../Base/Macro";
import { Token } from "../Base/Token";
import { DataCommandTag } from "../Command/DataCommand";
import { EnumTag } from "../Command/EnumCommand";
import { IncbinTag, IncludeTag } from "../Command/Include";
import { Analyser } from "../Compiler/Analyser";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { HighlightRange } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { VariableLine } from "../Lines/VariableLine";

export interface MatchInstruction {
	type: "instruction";
	line: InstructionLine;
	matchToken: Token;
}

export interface MatchCommand {
	type: "command";
	line: CommandLine;
	matchToken: Token;
}

export interface MatchVariable {
	type: "variable";
	line: VariableLine;
	matchToken: Token;
}

export interface MatchMacro {
	type: "macro";
	line: MacroLine;
	matchToken: Token;
}

export type MatchType = MatchInstruction | MatchCommand | MatchVariable | MatchMacro;

export interface MatchResult {
	type: "none" | "comment" | "instruction" | "command" | "macro" | "number" | "label" | "filePath";
	token: Token | undefined;
}

export class HelperUtils {

	private static useMarkDown = true;

	//#region 查找匹配的词元
	/**
	 * 查找匹配的词元
	 * @param fileIndex 文件编号
	 * @param lineText 当前行文本
	 * @param lineNumber 当前行号，从0开始
	 * @param current 光标所在行位置
	 * @returns 
	 */
	static FindMatchToken(fileIndex: number, lineText: string, lineNumber: number, current: number) {
		const result: MatchResult = { type: "none", token: undefined };
		const orgToken = new Token(lineText, { line: lineNumber });
		const lineContent = Analyser.GetContent(orgToken);
		if (current > lineContent.content.start + lineContent.content.length) {
			result.type = "comment";
			return result;
		}

		let macro: Macro | undefined;
		let temp;

		const range = Compiler.enviroment.GetRange(fileIndex, lineNumber);
		switch (range?.type) {
			case "macro":
				macro = Compiler.enviroment.allMacro.get(range.key);
				break
			case "enum":
				if (HelperUtils.MatchEnum(range, result, fileIndex, lineText, lineNumber, current))
					return result;

				break;
		}

		let match = Analyser.MatchLineCommon(lineContent.content);
		if (match.key === "unknow") {
			match = Analyser.MatchLine(lineContent.content, false, ["macro", Compiler.enviroment.allMacro])
		}

		switch (match.key) {
			case "instruction":
			case "command":
			case "macro":
				if (HelperUtils.CurrentInToken(current, match.content!.main) >= 0) {
					result.type = match.key;
					result.token = match.content!.main;
					return result;
				} else if (current > match.content!.rest.start && !match.content!.rest.isEmpty) {
					HelperUtils.MatchLabelOrNumber(lineText, current, result);
				} else if (current < match.content!.main.start && !match.content!.pre.isEmpty) {
					result.type = "label";
					result.token = match.content!.pre;
				}
				break;
		}

		// const match = HelperUtils.GetWord(lineText, current);


		return result;
	}
	//#endregion 查找匹配的词元

	//#region 左右匹配词源
	//#endregion 左右匹配词源

	//#region 获取光标所在字符
	/**
	 * 获取光标所在字符
	 * @param lineText 一行文本
	 * @param current 当前光标未知
	 * @returns rangeText: 为光标左边文本和光标右边文本, start: range[0] + start 
	 */
	static GetWord(lineText: string, current: number, start = 0) {

		let inString = false;
		let lastString = "";

		const range = [0, 0];
		current -= start;

		const match = "\t +-*/&|!^#,()[]{}<>";
		let findEnd = false;

		for (let i = 0; i < lineText.length; ++i) {

			if (inString && lineText[i] !== "\"") {
				lastString = lineText[i];
				continue;
			}

			if (lineText[i] === "\"") {
				if (!inString) {
					inString = true;
					range[0] = i;
				} else if (lastString !== "\\") {
					inString = false;
					range[1] = i + 1;
					findEnd = true;
				}
			} else if (match.includes(lineText[i])) {
				findEnd = !findEnd
				if (findEnd)
					range[1] = i;
				else
					range[0] = i + 1;
			}

			if (findEnd) {
				if (current >= range[0] && current <= range[1]) {
					break;
				} else {
					findEnd = false;
					range[0] = i + 1;
				}
			}

			lastString = lineText[i];
		}

		if (!findEnd)
			range[1] = lineText.length;

		const leftText = lineText.substring(range[0], current);
		const rightText = lineText.substring(current, range[1]);

		return { leftText, rightText, start: range[0] + start };
	}
	//#endregion 获取光标所在字符

	//#region 格式化注释
	/**
	 * 格式化注释
	 * @param option 要注释的文本
	 * @returns 
	 */
	static FormatComment(option: { macro?: Macro, comment?: string, value?: number, commadTip?: string }) {
		let result = "";
		if (option.comment !== undefined) {
			result += HelperUtils.useMarkDown ? option.comment.replace(/\n/g, "\n\n") : option.comment;
		}

		if (option.macro) {
			if (result !== "")
				result += HelperUtils.useMarkDown ? "\n\n---\n\n" : "\n";

			if (option.macro.params.size !== 0) {
				result += Localization.GetMessage("paramters");
				option.macro.params.forEach((v) => {
					result += (HelperUtils.useMarkDown ? `\`${v.label.token.text}\`` : v.label.token.text) + ", ";
				});
				result = result.substring(0, result.length - 2);
			}
		}

		if (option.value !== undefined) {
			if (result !== "")
				result += HelperUtils.useMarkDown ? "\n\n---\n\n" : "\n";

			const value = HelperUtils.ConvertValue(option.value);
			if (HelperUtils.useMarkDown) {
				result += "`BIN:` @" + value.bin + "\n\n";
				result += "`DEC:` " + value.dec + "\n\n";
				result += "`HEX:` $" + value.hex;
			} else {
				result += "BIN: @" + value.bin + "\n";
				result += "DEC: " + value.dec + "\n";
				result += "HEX: $" + value.hex;
			}
		}

		if (option.commadTip) {
			const command = option.commadTip.toLowerCase().substring(1);
			const tip = Localization.GetCommandTip(command as any);
			if (HelperUtils.useMarkDown) {
				result += tip.comment.replace(/\n/g, "\n\n");
				result += "\n\n";
				result += HelperUtils.ConvertCodeToMarkdown(tip.format);
				if (tip.exp) {
					result += "\n\n---\n\n" + Localization.GetMessage("example") + "\n\n";
					result += HelperUtils.ConvertCodeToMarkdown(tip.exp);
				}
			} else {
				result += tip.comment;
				result += "\n";
				result += tip.format;
				if (tip.exp) {
					result += "\n\n" + Localization.GetMessage("example") + "\n";
					result += tip.exp;
				}
			}
		}

		return result;
	}
	//#endregion 格式化注释

	//#region 匹配通用行
	/**
	 * 匹配通用行
	 * @param org 一行内容
	 */
	static MatchLine(org: Token) {
		let match = Analyser.MatchLineCommon(org);
		if (match.key === "unknow") {
			match = Analyser.MatchLine(org, false, ["macro", Compiler.enviroment.allMacro]);
		}
		return match;
	}
	//#endregion 匹配通用行

	//#region 查询当前光标在所在表达式的Token
	/**
	 * 查询当前光标在所在表达式的Token
	 * @param current 
	 * @param exp 
	 * @returns 
	 */
	static CurrentInExpression(current: number, ...exp: Expression[]) {
		let range;
		let result = { expIndex: -1, token: {} as Token, type: "none" as "none" | "label" | "number" };
		for (let i = 0; i < exp.length; i++) {
			range = { min: undefined as number | undefined, max: undefined as number | undefined };
			for (let j = 0; j < exp[i].parts.length; j++) {
				const part = exp[i].parts[j];
				if (range.min === undefined || range.min > part.token.start) {
					range.min = part.token.start;
				}

				const end = part.token.start + part.token.length;
				if (range.max === undefined || range.max < end) {
					range.max = end;
				}

				switch (part.type) {
					case PriorityType.Level_1_Label:
					case PriorityType.Level_2_Number:
						if (part.token.start <= current && current <= end) {
							result.expIndex = i;
							result.token = part.token;
							result.type = part.type === PriorityType.Level_1_Label ? "label" : "number";
							return result;
						}
						continue;
					default:
						continue;
				}
			}

			if (range.min !== undefined && current >= range.min && current <= (range.max as number)) {
				result.expIndex = i;
				return result;
			}

			range = { min: undefined, max: undefined };
		}
	}
	//#endregion 查询当前光标在所在表达式的Token

	//#region 查询当前光标所在的Token
	/**
	 * 查询当前光标所在的Token
	 * @param current 当前光标位置
	 * @param tokens 所有要匹配的Token
	 * @returns 返回匹配中的Index
	 */
	static CurrentInToken(current: number, ...tokens: Token[]) {
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token.start <= current && current <= token.start + token.length)
				return i;
		}

		return -1;
	}
	//#endregion 查询当前光标所在的Token

	/***** 特殊命令处理 *****/

	//#region 特殊命令处理
	private static CommandSp(fileIndex: number, lineText: string, lineNumber: number, current: number, matchResult: MatchResult) {
		const lines = Compiler.enviroment.allLine.get(fileIndex);
		if (!lines)
			return false;

		const line = lines[lineNumber] as CommandLine;
		if (!line)
			return false;

		let tag;
		let temp;
		const com = line.command.text.toLocaleUpperCase();
		switch (com) {
			case ".DB":
			case ".DW":
			case ".DL":
				if (current > line.command.start + line.command.length) {
					HelperUtils.MatchLabelOrNumber(lineText, current, matchResult);
					return true;
				}
				break;
			case ".INCLUDE":
			case ".INCBIN":
				tag = line.tag as IncludeTag | IncbinTag;
				if (HelperUtils.CurrentInToken(current, tag.orgPath) >= 0) {
					matchResult.type = "filePath";
					matchResult.token = new Token(tag.path);
					return true;
				}

				temp = (tag as IncbinTag).exps;
				if (temp) {
					HelperUtils.CurrentInExpression(current, ...temp)
				}
				break;
		}
		return false;
	}

	//#region 匹配 Enum 命令内的表达式
	/**
	 * 匹配 Enum 命令内的表达式
	 * @param range 高亮范围
	 * @param matchResult 匹配结果
	 * @param fileIndex 文件Index
	 * @param lineNumber 行号
	 * @param current 当前光标位置
	 * @returns 
	 */
	private static MatchEnum(range: HighlightRange, matchResult: MatchResult, fileIndex: number, lineText: string, lineNumber: number, current: number) {
		const tempLine = Compiler.enviroment.allLine.get(fileIndex)?.[range.startLine] as CommandLine;
		if (!tempLine || lineNumber === range.startLine || lineNumber === range.endLine)
			return false;

		const tag: EnumTag = tempLine.tag;
		for (let i = 0; i < tag.lines.length; i++) {
			const line = tag.lines[i];
			if (!line || line.labelToken.line !== lineNumber)
				continue;

			if (HelperUtils.CurrentInToken(current, line.labelToken) >= 0) {
				matchResult.token = line.labelToken;
				matchResult.type = "label";
				return true;
			}

			HelperUtils.MatchLabelOrNumber(lineText, current, matchResult);
			return true;
		}
	}
	//#endregion 匹配 Enum 命令内的表达式

	/***** private *****/

	//#region 匹配标签或数字
	/**
	 * 匹配标签或数字
	 * @param lineText 一行文本
	 * @param current 当前光标位置
	 * @param matchResult 匹配的结果
	 */
	private static MatchLabelOrNumber(lineText: string, current: number, matchResult: MatchResult) {
		let temp = HelperUtils.GetWord(lineText, current);
		const text = temp.leftText + temp.rightText;
		const tempNumber = ExpressionUtils.GetNumber(text);
		if (tempNumber.success) {
			matchResult.type = "number";
		} else {
			matchResult.type = "label";
		}
		matchResult.token = new Token(text, { start: temp.start });
	}
	//#endregion 匹配标签或数字

	//#region 将结果值运算成其他进制
	/**
	 * 将结果值运算成其他进制
	 * @param value 要运算的值
	 * @returns 2 10 16进制结果
	 */
	private static ConvertValue(value: number) {
		let result = { bin: "", dec: "", hex: "" };
		let temp = value;
		do {
			let temp2 = (temp & 0xF).toString(2);
			let array = temp2.padStart(4, "0");
			result.bin = " " + array + result.bin;
			temp >>>= 4;
		} while (temp !== 0)
		result.bin = result.bin.substring(1);
		result.dec = value.toString();
		result.hex = value.toString(16).toUpperCase();
		return result;
	}
	//#endregion 将结果值运算成其他进制

	//#region 将代码转 markdown
	private static ConvertCodeToMarkdown(code: string) {
		let result = "```\n";
		const lines = code.split(/\n/);
		for (let i = 0; i < lines.length; i++)
			result += "    " + lines[i] + "\n";

		result += "```";
		return result;
	}
	//#endregion 将代码转 markdown

}
