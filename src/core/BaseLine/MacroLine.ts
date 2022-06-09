import { CommonOption } from "../Base/CommonOption";
import { Compile } from "../Base/Compile";
import { GlobalVar } from "../Base/GlobalVar";
import { Macro } from "../Base/Macro";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Token, TokenType } from "../Base/Token";
import { LabelUtils } from "../Utils/LabelUtils";
import { LexerUtils, LexPart } from "../Utils/LexerUtils";
import { MacroUtils } from "../Utils/MacroUtils";
import { Utils } from "../Utils/Utils";
import { BaseLineType, BaseLineUtils, IBaseLine } from "./BaseLine";

export class MacroLine implements IBaseLine {

	//#region 创建一行
	static CreateLine(parts: { pre: Token, match: Token, after: Token }, comment?: string) {
		let macroLine = new MacroLine();
		if (!parts.pre.isNull) {
			macroLine.label = parts.pre;
			LabelUtils.CreateLabel(parts.pre, undefined, comment);
			macroLine.label.type = TokenType.Label;
		}

		macroLine.keyword = parts.match;
		macroLine.keyword.type = TokenType.Macro;
		if (parts.after.isNull) {
			macroLine.params = [];
		} else {
			let temp = Utils.SplitComma(parts.after);
			if (!temp.success)
				macroLine.errorLine = true;

			macroLine.params = temp.parts;
		}

		let hash = Utils.GetHashcode(macroLine.keyword.text);
		let macro = GlobalVar.env.allMacro[hash];
		if (macro.parameterCount != macroLine.params.length) {
			MyException.PushException(macroLine.keyword, ErrorType.ArgumentCountError, ErrorLevel.Show);
			macroLine.errorLine = true;
			return macroLine;
		}

		macroLine.expParts = [];
		for (let i = 0; i < macroLine.params.length; i++) {
			macroLine.expParts[i] = [];
			let temp = LexerUtils.SplitAndSort(macroLine.params[i]);
			if (temp)
				macroLine.expParts[i] = temp;
			else
				macroLine.errorLine = true;
		}

		macroLine.comment = comment;
		return macroLine;
	}

	//#endregion 创建一行

	//#region 第三次分析，分析表达式是否正确
	static async ThirdAnalyse(option: CommonOption) {
		const line = <MacroLine>option.allLine[option.lineIndex];
		let macro = MacroUtils.FindMacro(line.keyword.text);
		let tempOption: CommonOption = {
			allLine: macro.lines,
			lineIndex: 0,
			macro
		};
		await Compile.ThirdAnalyse(tempOption);
	}
	//#endregion 第三次分析，分析表达式是否正确

	//#region 编译自定义函数
	static async CompileMacro(option: CommonOption) {
		const line = <MacroLine>option.allLine[option.lineIndex];

		if (line.label) {
			let label = LabelUtils.FindLabel(line.label, option);
			if (label) { label.value = GlobalVar.env.originalAddress; }
			delete (line.label);		// 删除，不再赋值
		}

		let macro: Macro = Utils.DeepClone(MacroUtils.FindMacro(line.keyword.text));
		for (let i = 0; i < line.expParts.length; i++) {
			let result = LexerUtils.GetExpressionValue(line.expParts[i], "getValue", option);
			if (result.success)
				macro.labels[macro.parameterHash[i]].value = result.value;
		}
		let tempOption: CommonOption = {
			allLine: macro.lines,
			lineIndex: 0,
			macro: macro
		}
		line.resultLines = macro.lines;
		await Compile.CompileAndGetResult(tempOption);
		line.isFinished = true;
		return true;
	}
	//#endregion 编译自定义函数

	lineType = BaseLineType.Macro;
	orgText!: Token;
	errorLine = false;
	isFinished = false;

	label?: Token;
	keyword!: Token;
	params!: Token[];
	expParts: LexPart[][] = [];
	comment?: string;

	orgAddress: number = -1;
	baseAddress: number = -1;
	resultLines: IBaseLine[] = [];

	GetToken(): Token[] {
		let result: Token[] = [];
		if (this.label)
			result.push(this.label);

		result.push(this.keyword);
		for (let i = 0; i < this.expParts.length; i++)
			result.push(...LexerUtils.LexPartsToTokens(this.expParts[i]));

		return result;
	}
}