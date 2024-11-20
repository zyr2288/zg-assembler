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
import { DefTag } from "../Command/DefinedCommand";
import { MsgTag } from "../Command/MsgErrCommand";

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
				HighlightingProvider.GetExpression(option.result, line.expression);
				break;
			case "instruction":
				HighlightingProvider.GetLabel(line.label, option.result);
				HighlightingProvider.GetToken(line.instruction, HighlightType.Keyword, option.result);
				HighlightingProvider.GetExpression(option.result, ...line.expressions);
				break;
			case "command":
				HighlightingProvider.GetCommandHighlighting(option);
				break;
			case "macro":
				HighlightingProvider.GetLabel(line.label, option.result);
				HighlightingProvider.GetToken(line.name, HighlightType.Macro, option.result);
				HighlightingProvider.GetExpression(option.result, ...line.expressions)
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

	static GetExpression(result: HighlightToken[], ...expressions: Expression[]) {
		for (let i = 0; i < expressions.length; i++) {
			for (let j = 0; j < expressions[i].parts.length; j++) {
				const part = expressions[i].parts[j];
				HighlightingProvider.GetToken(part.token, part.highlightType, result);
			}
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
			case ".DEF":
				tag = option.GetCurrent<CommandLine>()!.tag as DefTag;
				if (tag.exp)
					HighlightingProvider.GetExpression(option.result, tag.exp);

				break;
			case ".ENUM":
				tag = option.GetCurrent<CommandLine>()!.tag as EnumTag;
				if (tag.exp)
					HighlightingProvider.GetExpression(option.result, tag.exp);

				for (let i = 0; i < tag.lines.length; i++) {
					const line = tag.lines[i];
					if (!line)
						continue;

					HighlightingProvider.GetToken(line.labelToken, HighlightType.Defined, option.result);
					HighlightingProvider.GetExpression(option.result, line.expression);
				}
				option.index += tag.lines.length;
				break;
			case ".DB":
			case ".DW":
			case ".DL":
				tag = line.tag as DataCommandTag;
				HighlightingProvider.GetExpression(option.result, ...tag);
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
					HighlightingProvider.GetExpression(option.result, tag.exp);
				break;
			case ".MSG":
			case ".ERROR":
				tag = line.tag as MsgTag;
				if (tag.expressions)
					HighlightingProvider.GetExpression(option.result, ...tag.expressions);
				
				break;
		}
	}
}