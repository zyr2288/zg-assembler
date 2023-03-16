import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class VariableLine implements ICommonLine {
	type = LineType.Variable;
	compileType = LineCompileType.None;
	orgText!: Token;

	labelToken?: Token;
	label!: ILabel;

	expression?: Token;
	exprParts: ExpressionPart[] = [];

	comment?: string;

	constructor(option: { labelToken: Token, expression: Token }) {
		this.labelToken = option.labelToken;
		this.expression = option.expression;
	}

	GetTokens() {
		let result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens([this.exprParts]));
		return result;
	}
}

export class VariableLineUtils {
	static FirstAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<VariableLine>()
		let label = LabelUtils.CreateLabel(line.label.token, option);
		if (label) {
			line.label = label;
			line.label.labelType = LabelType.Variable;
		} else {
			line.compileType = LineCompileType.Error;
		}
		delete (line.labelToken);

		let parts = ExpressionUtils.SplitAndSort(line.expression!);
		if (parts)
			line.exprParts = parts;
		else
			line.compileType = LineCompileType.Error;

		delete (line.expression);
	}

	static ThirdAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as VariableLine;
		let temp = ExpressionUtils.GetExpressionValue(line.exprParts, ExpressionResult.TryToGetResult, option);
		if (temp.success)
			line.label.value = temp.value;
	}
}