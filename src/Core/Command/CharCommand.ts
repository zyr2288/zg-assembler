import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Compiler } from "../Compiler/Compiler";
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

	AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const exps: Array<Expression | undefined> = [];

		exps[0] = ExpressionUtils.SplitAndSort(line.arguments[0]);
		if (!exps) {
			line.lineType = LineType.Error;
			return;
		}

		const token = AnalyseString(line.arguments[1]);
		if (!token) {
			line.lineType = LineType.Error;
			return;
		}

		const chars = ExpressionUtils.SplitStringToChars(token);
		if (!chars) {
			line.lineType = LineType.Error;
			return;
		}

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
		if (Compiler.FirstCompile()) {
			this.AnalyseFirst(option);
		}

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
				const token = ExpressionUtils.CombineExpressionPart(tag.exp[1].parts);
				MyDiagnostic.PushException(token, error);
				return;
			}
		}

		let start = value.value, result;
		for (let i = 0; i < tag.chars.length; i++) {
			const chr = tag.chars[i];
			result = { value: start, length: chrFixLength };
			Compiler.enviroment.charMap.set(chr, result);
			start++;
		}

		line.lineType = LineType.Finished;
	}
}

export class StrCommand implements ICommand {
	start: ICommandName = { name: ".STR", min: 1, max: 2 };
	allowLabel = false;

	AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();

		const token = AnalyseString(line.arguments[0]);
		if (!token) {
			line.lineType = LineType.Error;
			return;
		}

		const chars = ExpressionUtils.SplitStringToChars(token);
		if (!chars) {
			line.lineType = LineType.Error;
			return;
		}

		line.tag = { lineNumber: line.org.line, start: line.arguments[0].start + 1, chars } as StrCommandTag;
	}

	Compile(option: CompileOption) {
		if (Compiler.FirstCompile()) {
			this.AnalyseFirst(option);
		}

		const line = option.GetCurrent<CommandLine>();
		const tag = line.tag as StrCommandTag;
		const chars = tag.chars;

		line.lineResult.SetAddress();
		line.lineType = LineType.Finished;

		let temp, strIndex = tag.start;
		for (let i = 0; i < chars.length; i++) {
			const chr = chars[i];
			temp = Compiler.enviroment.charMap.get(chr);

			if (temp === undefined) {
				temp = { value: 0, length: 0 };
				if (chr.length === 1)
					temp = { value: chr.charCodeAt(0), length: 0 };

				const error = Localization.GetMessage("Character not found in .STR", chr, temp.value);
				const token = new Token(chr, { start: strIndex, line: line.org.line });
				MyDiagnostic.PushWarning(token, error);
			}

			temp = this.GetValues(temp);
			line.lineResult.result.push(...temp);
			strIndex += chr.length;
		}
	}

	private GetValues(char: { value: number, length: number }) {
		let temp = char.value, length = char.length, result: number[] = [];
		if (char.length === 0) {
			do {
				result.unshift(temp & 0xFF);
				temp >>>= 8;
			} while (temp !== 0);
		} else {
			do {
				result.unshift(temp & 0xFF);
				temp >>>= 8;
			} while (--length > 0);
		}
		return result;
	}
}

function AnalyseString(token: Token) {
	const temp = token.Trim();
	if (temp.text.startsWith("\"") && temp.text.endsWith("\""))
		return temp.Substring(1, temp.text.length - 2);

	const error = Localization.GetMessage("String format error");
	MyDiagnostic.PushException(token, error);
	return;
}