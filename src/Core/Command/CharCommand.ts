import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { ICommand, ICommandName } from "./Command";

export type CharCommmandTag = {
	/** 
	 * 0: 字符映射起始表达式
	 * 
	 * 1: 字符串固定长度的表达式（可选）
	 */
	exp: Expression[];
	chars: string[];
}

export type StrCommandTag = {
	lineNumber: number;
	start: number;
	chars: string[];
}

export class CharCommand implements ICommand {

	start: ICommandName = { name: ".CHRMAP", min: 2, max: 3 };
	allowLabel = false;

	static CharMap = new Map<string, number[]>();

	AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const exps: Array<Expression | undefined> = [];

		exps[0] = ExpressionUtils.SplitAndSort(line.arguments[0]);
		if (!exps) {
			line.lineType = LineType.Error;
			return;
		}

		const chars = AnalyseString(line.arguments[1].Trim());
		if (line.arguments[2]) {
			exps[1] = ExpressionUtils.SplitAndSort(line.arguments[2]);
		}

		line.tag = { exp: exps, chars } as CharCommmandTag;
	}

	AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag = line.tag as CharCommmandTag;
		if (ExpressionUtils.CheckLabels(option, tag.exp[0]))
			return;

		if (tag.exp[1] && ExpressionUtils.CheckLabels(option, tag.exp[1]))
			return;
	}

	Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag = line.tag as CharCommmandTag;

		// 字符固定长度，0为自动
		let chrFixLength = 0;

		const value = ExpressionUtils.GetValue(tag.exp[0].parts, { ...option, tryValue: false });
		if (!value.success) {
			line.lineType = LineType.Error;
			return;
		}

		if (tag.exp[1]) {
			const value = ExpressionUtils.GetValue(tag.exp[1].parts, { ...option, tryValue: false });
			if (!value.success) {
				line.lineType = LineType.Error;
				return;
			}
			chrFixLength = value.value;
			if (chrFixLength < 0) {
				const error = Localization.GetMessage("Comamnd .CHRMAP argument error");
				MyDiagnostic.PushException(line.command, error);
				return;
			}
		}

		let start = value.value, result, tempValue, tempLength;
		for (let i = 0; i < tag.chars.length; i++) {
			const chr = tag.chars[i];
			result = [] as number[];
			tempValue = start;
			if (chrFixLength === 0) {
				do {
					result.unshift(tempValue & 0xFF);
					tempValue >>>= 8;
				} while (tempValue !== 0)
			} else {
				tempLength = chrFixLength;
				do {
					result.unshift(tempValue & 0xFF);
					tempValue >>>= 8;
				} while (--tempLength > 0)
			}
			CharCommand.CharMap.set(chr, result);
			start++;
		}
	}
}

export class StrCommand implements ICommand {
	start: ICommandName = { name: ".STRING", min: 1, max: 2 };
	allowLabel = false;

	AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();

		const chars = AnalyseString(line.arguments[0]);
		line.tag = { lineNumber: line.org.line, start: line.arguments[0].start, chars } as StrCommandTag;
	}

	Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag = line.tag as StrCommandTag;
		const chars = tag.chars;

		let tempValue: number[] = [], temp, strIndex = tag.start;
		for (let i = 0; i < chars.length; i++) {
			const chr = chars[i];
			temp = CharCommand.CharMap.get(chr);

			if (temp === undefined) {
				line.lineType = LineType.Error;
				const error = Localization.GetMessage("Command .STR: character not found");
				const token = new Token(chr, { start: strIndex, line: line.org.line });
				MyDiagnostic.PushException(token, error);
				return;
			}

			tempValue.push(...temp);
		}
	}
}

function AnalyseString(str: Token, useUnicode = false) {
	const result: string[] = [];

	if (!str.text.startsWith("\"") || !str.text.endsWith("\"")) {
		const error = Localization.GetMessage("Comamnd .STRING arguments error");
		MyDiagnostic.PushException(str, error);
		return;
	}

	const token = str.Substring(1, str.length - 2);
	const GetChar = (index: number, length?: number) => {
		length = length || 1;
		if (index + length - 1 >= str.length)
			return;

		return token.text.substring(index, index + length);
	}

	const AddToResult = (chr:string) => {
		if (inRange) {
			result[result.length - 1] += chr;
			return;
		}

		result.push(chr);
	}

	let inMark = false, inRange = false;
	for (let i = 0; i < token.length; i++) {
		const chr = token.text[i];
		switch (chr) {
			case "\\":			// 转义字符
				if (inMark) {
					result.push(chr);
					inMark = false;
					break;
				}
				inMark = true;
				break;

			case "x":
				if (inMark) {
					if (!useUnicode) {
						const error = Localization.GetMessage("Comamnd .CHRMAP argument error");
						MyDiagnostic.PushException(str, error);
						return;
					}

					const chr = GetChar(i + 1, 2);
					if (!chr) {
						const error = Localization.GetMessage("Comamnd .CHRMAP argument error");
						MyDiagnostic.PushException(str, error);
						return;
					}
					break;
				}
				AddToResult(chr);
				break;

			case "u":
				if (inMark) {
					if (!useUnicode) {
						const error = Localization.GetMessage("Comamnd .CHRMAP argument error");
						MyDiagnostic.PushException(str, error);
						return;
					}

					const chr = GetChar(i + 1, 2);
					if (!chr) {
						const error = Localization.GetMessage("Comamnd .CHRMAP argument error");
						MyDiagnostic.PushException(str, error);
						return;
					}
					break;
				}
				AddToResult(chr);
				break;

			case "{":			// 开始范围
				if (inMark) {
					result.push(chr);
					inMark = false;
					break;
				}

				if (inRange) {
					const error = Localization.GetMessage("Comamnd .CHRMAP argument error");
					MyDiagnostic.PushException(str, error);
					return;
				}

				inRange = true;
				result.push("");
				break;

			case "}":			// 结束范围
				if (inMark) {
					result.push(chr);
					inMark = false;
					break;
				}

				if (!inRange) {
					const error = Localization.GetMessage("Comamnd .CHRMAP argument error");
					MyDiagnostic.PushException(str, error);
					return;
				}

				inRange = false;
				break;
			default:
				AddToResult(chr);
				break;
		}
	}

	return result;
}