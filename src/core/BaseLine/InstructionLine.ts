import { CommonOption } from "../Base/CommonOption";
import { LabelDefinedState } from "../Base/Label";
import { Token, TokenType } from "../Base/Token";
import { Platform } from "../Platform/Platform";
import { LabelUtils } from "../Utils/LabelUtils";
import { LexerUtils, LexPart } from "../Utils/LexerUtils";
import { BaseLineType, IBaseLine } from "./BaseLine";

export class InstructionLine implements IBaseLine {

	/***** Static *****/

	//#region 创建基本行，不做另外分析
	/**
	 * 创建基本行，不做另外分析
	 * @param parts 每一个部分
	 * @param comment 注释
	 * @returns 
	 */
	static CreateLine(parts: { pre: Token, match: Token, after: Token }, comment?: string) {
		let insLine = new InstructionLine();

		if (!parts.pre.isNull) {
			insLine.label = parts.pre;
			insLine.label.type = TokenType.Label;
		}

		insLine.keyword = parts.match;
		insLine.keyword.text = insLine.keyword.text.toUpperCase();
		insLine.keyword.type = TokenType.Keyword;

		insLine.expression = parts.after;

		insLine.comment = comment;

		return insLine;
	}
	//#endregion 创建基本行，不做另外分析

	//#region 第一次分析，分割表达式，获取寻址方式
	static FirstAnalyse(option: CommonOption) {
		let line = <InstructionLine>option.allLine[option.lineIndex];

		if (line.label) {
			let label = LabelUtils.CreateLabel(line.label, undefined, line.comment, option);
			if (label) label.labelDefined = LabelDefinedState.Label;
		}

		let temp = Platform.instructionAnalyser.GetAddressType(line.expression);
		line.addressType = temp.types;
		line.expression = temp.expression;

		return Platform.instructionAnalyser.FirstAnalyse(option);
	}
	//#endregion 第一次分析，分割表达式，获取寻址方式

	//#region 第三次分析，分析表达式标签是否存在
	static ThirdAnalyse(option: CommonOption) {
		return Platform.instructionAnalyser.ThirdAnalyse(option);
	}
	//#endregion 第三次分析，分析表达式标签是否存在

	/***** Property *****/

	//#region 属性
	lineType = BaseLineType.Instruction;
	orgText!: Token;
	errorLine = false;

	label?: Token;
	keyword!: Token;
	expression!: Token;
	expParts: LexPart[] = [];
	addressType!: number[];
	comment?: string;
	tag?: any;

	orgAddress = -1;
	baseAddress = -1;
	result: number[] = [];
	isFinished = false;

	GetToken(): Token[] {
		let result: Token[] = [];
		if (this.label && !this.label.isNull)
			result.push(this.label);

		result.push(this.keyword);
		result.push(...LexerUtils.LexPartsToTokens(this.expParts));
		return result;
	}
	//#endregion 属性

}