import { Compiler } from "../Compiler/Compiler";
import { Expression } from "../Base/ExpressionUtils";
import { Token } from "../Base/Token";
import { CommonLine } from "../Lines/CommonLine";
import { LabelLine } from "../Lines/LabelLine";
import { EnumCommand, EnumTag } from "../Command/EnumCommand";
import { DataCommandTag } from "../Command/DataCommand";
import { CommandLine } from "../Lines/CommandLine";
import { MacroCommand } from "../Command/MacroCommand";
import { CommandTagBase } from "../Command/Command";

export class HighlightOption {
	lines: CommonLine[] = [];
	index: number = 0;
	result: HighlightToken[] = [];

	/**获取当前行，肯能会不存在 */
	GetCurrent<T extends CommonLine>() {
		return this.lines[this.index] as T | undefined;
	}
}

export interface HighlightToken {
	line: number;
	start: number;
	length: number;
	type: number;
}

export enum HighlightType {
	/**无 */
	None,
	/**标签 */
	Label,
	/**关键字 */
	Keyword,
	/**自定义函数 */
	Macro,
	/**定义的常量 */
	Defined,
	/**定义的变量 */
	Variable,
	/**数字 */
	Number,
}

export class HighlightingProvider {

	/**高亮文档 */
	static HighlightDocument(filePath: string) {

		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);

		const lines = Compiler.enviroment.allLine.get(fileIndex);
		if (!lines)
			return [];

		const option = new HighlightOption();
		option.lines = lines;

		HighlightingProvider.GetHighlight(option);

		return option.result;
	}

	static GetHighlight(option: HighlightOption) {
		for (let i = 0; i < option.lines.length; i++) {
			option.index = i;
			HighlightingProvider.GetHighlightToken(option);
			i = option.index;
		}
	}

	private static GetHighlightToken(option: HighlightOption) {
		const line = option.GetCurrent();
		if (!line)
			return;

		switch (line.key) {
			case "label":
				HighlightingProvider.GetLabel(line, option.result);
				break;
			case "variable":
				HighlightingProvider.GetExpression(line.expression, option.result);
				break;
			case "instruction":
				HighlightingProvider.GetLabel(line.label, option.result);
				HighlightingProvider.GetToken(line.instruction, HighlightType.Keyword, option.result);

				for (let i = 0; i < line.expressions.length; i++)
					HighlightingProvider.GetExpression(line.expressions[i], option.result);

				break;
			case "command":
				HighlightingProvider.GetCommandHighlighting(option);
				break;
			case "macro":
				HighlightingProvider.GetLabel(line.label, option.result);
				HighlightingProvider.GetToken(line.name, HighlightType.Macro, option.result);
				break;
		}
	}

	static GetToken(token: Token, type: HighlightType, result: HighlightToken[]) {
		result.push({
			line: token.line,
			start: token.start,
			length: token.length,
			type
		});
	}

	static GetExpression(expression: Expression, result: HighlightToken[]) {
		for (let i = 0; i < expression.parts.length; i++) {
			const part = expression.parts[i];
			HighlightingProvider.GetToken(part.token, part.highlightType, result);
		}
	}

	private static GetLabel(labelLine: LabelLine | undefined, result: HighlightToken[],) {
		if (labelLine) {
			HighlightingProvider.GetToken(labelLine.labelToken, HighlightType.Label, result);
		}
	}

	private static GetCommandHighlighting(option: HighlightOption) {
		const line = option.lines[option.index] as CommandLine;

		let tag;
		HighlightingProvider.GetLabel(line.label, option.result);
		switch (line.command.text) {
			case ".ENUM":
				tag = option.GetCurrent<CommandLine>()!.tag as EnumTag;
				if (tag.exp)
					HighlightingProvider.GetExpression(tag.exp, option.result);

				for (let i = 0; i < tag.lines.length; i++) {
					const line = tag.lines[i];
					if (!line)
						continue;

					HighlightingProvider.GetToken(line.labelToken, HighlightType.Defined, option.result);
					HighlightingProvider.GetExpression(line.expression, option.result);
				}
				option.index += tag.lines.length;
				break;
			case ".DB":
			case ".DW":
			case ".DL":
				tag = line.tag as DataCommandTag;
				for (let i = 0; i < tag.length; i++)
					HighlightingProvider.GetExpression(tag[i], option.result);

				break;
			case ".MACRO":
				MacroCommand.GetHighlight(option);
				break;
			case ".ORG":
			case ".BASE":
			case ".IF":
			case ".ELSEIF":
				tag = line.tag as CommandTagBase;
				if (tag.exp)
					HighlightingProvider.GetExpression(tag.exp, option.result);
				break;
		}
	}
}