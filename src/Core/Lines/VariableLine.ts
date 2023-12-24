import { ExpressionPart, ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
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

	/**标签 */
	saveLabel!: {
		/**初始化时候暂存的Token，用完即销毁 */
		token?: Token;
		/**标签的Token */
		label: ILabel;
		/**标签的Hash */
		notFinish: boolean;
	}

	expression?: Token;
	expParts: ExpressionPart[][] = [];

	comment?: string;

	Initialize(option: { labelToken: Token, expression: Token }) {
		this.saveLabel = { token: option.labelToken, label: {} as ILabel, notFinish: true };
		this.expression = option.expression;
	}

	GetTokens() {
		let result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}
}

/**变量行工具 */
export class VariableLineUtils {

	static FirstAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<VariableLine>();
		const label = line.saveLabel.label;
		if (label) {
			label.labelType = LabelType.Variable;
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
		const label = line.saveLabel.label
		if (label && temp.success) {
			label.value = temp.value;
			line.saveLabel.notFinish = true;
		}
	}
}