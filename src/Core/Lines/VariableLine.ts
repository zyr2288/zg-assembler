import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { HighlightToken, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class VariableLine implements ICommonLine {
	type = LineType.Variable;
	compileType = LineCompileType.None;
	orgText!: Token;

	labelToken?: Token;
	labelHash?: number;

	expression?: Token;
	exprParts: ExpressionPart[] = [];

	comment?: string;

	Initialize(option: { labelToken: Token, expression: Token }) {
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
		const line = option.GetCurrectLine<VariableLine>();
		let label = LabelUtils.CreateLabel(line.labelToken!, option);
		if (label) {
			label.labelType = LabelType.Variable;
		} else {
			line.compileType = LineCompileType.Error;
		}

		if (line.expression!.isEmpty) {
			let errorMsg = Localization.GetMessage("Expression error");
			MyDiagnostic.PushException(line.expression!, errorMsg);
			line.compileType = LineCompileType.Error;
		} else {
			let parts = ExpressionUtils.SplitAndSort(line.expression!);
			if (parts)
				line.exprParts = parts;
			else
				line.compileType = LineCompileType.Error;
		}
		delete (line.expression);
	}

	static ThirdAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<VariableLine>();
		if (ExpressionUtils.CheckLabelsAndShowError(line.exprParts, option)) {
			line.compileType = LineCompileType.Error;
			return;
		}

		let temp = ExpressionUtils.GetExpressionValue(line.exprParts, ExpressionResult.TryToGetResult, option);
		let label = LabelUtils.FindLabel(line.labelToken, option.macro);
		if (label && temp.success)
			label.value = temp.value;
	}
}