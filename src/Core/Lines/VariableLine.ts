import { ExpressionPart, ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { HighlightToken, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class VariableLine implements ICommonLine {
	type = LineType.Variable;
	compileType = LineCompileType.None;
	orgText!: Token;

	label!: { token: Token, hash?: number };
	labelToken?: Token;
	/**使用 labelHash 记忆，以免深拷贝时无法正确使用 */
	labelHash?: number;

	expression?: Token;
	expParts: ExpressionPart[][] = [];

	comment?: string;

	Initialize(option: { labelToken: Token, expression: Token }) {
		this.label = { token: option.labelToken };
		this.expression = option.expression;
	}

	GetTokens() {
		let result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}
}

export class VariableLineUtils {
	static FirstAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<VariableLine>();
		const labelMark = LabelUtils.CreateLabel(line.label.token, option, false);
		if (labelMark) {
			labelMark.label.labelType = LabelType.Variable;
			line.labelHash = labelMark.hash;
		} else {
			line.compileType = LineCompileType.Error;
		}

		if (line.expression!.isEmpty) {
			const errorMsg = Localization.GetMessage("Expression error");
			MyDiagnostic.PushException(line.expression!, errorMsg);
			line.compileType = LineCompileType.Error;
		} else {
			const parts = ExpressionUtils.SplitAndSort(line.expression!);
			if (parts)
				line.expParts[0] = parts;
			else
				line.compileType = LineCompileType.Error;
		}
		delete (line.expression);
	}

	static ThirdAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<VariableLine>();
		if (ExpressionUtils.CheckLabelsAndShowError(line.expParts[0], option)) {
			line.compileType = LineCompileType.Error;
			return;
		}

		const analyseOption: ExpAnalyseOption = { analyseType: "Try" };
		const temp = ExpressionUtils.GetExpressionValue<number>(line.expParts[0], option, analyseOption);
		const label = LabelUtils.FindLabelWithHash(line.labelHash, option.macro);
		if (label && temp.success)
			label.value = temp.value;
	}
}