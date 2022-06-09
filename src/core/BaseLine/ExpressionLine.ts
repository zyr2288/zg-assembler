import { CommonOption } from "../Base/CommonOption";
import { LabelDefinedState } from "../Base/Label";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Token, TokenType } from "../Base/Token";
import { LabelUtils } from "../Utils/LabelUtils";
import { LexerUtils, LexPart } from "../Utils/LexerUtils";
import { BaseLineType, BaseLineUtils, IBaseLine } from "./BaseLine";

export class ExpressionLine implements IBaseLine {

	//#region 创建行
	static CreateLine(parts: { pre: Token, match: Token, after: Token }, comment?: string) {
		let expLine = new ExpressionLine();
		expLine.label = parts.pre;
		expLine.label.type = TokenType.Variable;
		expLine.expression = parts.after;

		return expLine;
	}
	//#endregion 创建行

	//#region 第一次分析，删除expression
	static FirstAnalyse(option: CommonOption) {
		let line = <ExpressionLine>option.allLine[option.lineIndex];

		let label = LabelUtils.CreateLabel(line.label, undefined, line.comment, option);
		if (!label) {
			line.errorLine = true;
		} else {
			label.labelDefined = LabelDefinedState.Variable;
		}

		let temp = LexerUtils.SplitAndSort(line.expression!);
		if (!temp || temp.length == 0) {
			line.errorLine = true;
			MyException.PushException(line.expression!, ErrorType.ExpressionError, ErrorLevel.Show);
		} else {
			line.expParts = temp;
		}
		delete (line.expression);
	}
	//#endregion 第一次分析，删除expression

	//#region 第三次分析，分析表达式标签是否存在
	static ThirdAnalyse(option: CommonOption) {
		let line = <ExpressionLine>option.allLine[option.lineIndex];
		let temp = LexerUtils.CheckLabelsAndShowError(line.expParts, option);
		if (temp)
			line.errorLine = true;
	}
	//#endregion 第三次分析，分析表达式标签是否存在

	lineType = BaseLineType.Expression;
	orgText!: Token;
	errorLine = false;
	isFinished = false;

	label!: Token;
	expParts: LexPart[] = [];
	comment?: string;
	/**临时存放整体表达式 */
	expression?: Token;

	GetToken(): Token[] {
		let result: Token[] = [];
		result.push(this.label);
		result.push(...this.expParts.map(v => v.token));
		return result;
	}
}