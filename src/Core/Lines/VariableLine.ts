import { ExpressionPart, ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { CommonSaveLabel, HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class VariableLine {
	type: LineType.Variable = LineType.Variable;
	compileType = LineCompileType.None;
	orgText!: Token;

	/**标签 */
	saveLabel?: CommonSaveLabel;

	expression?: Token;
	expParts: ExpressionPart[][] = [];

	comment?: string;

	Initialize(option: { labelToken: Token, expression: Token }) {
		this.orgText = option.labelToken;
		this.saveLabel = { token: option.labelToken, label: {} as ILabel, notFinish: true };
		this.expression = option.expression;
	}

	GetTokens() {
		const result: HighlightToken[] = [];
		if (this.saveLabel)
			result.push({ type: HighlightType.Variable, token: this.saveLabel.label.token });

		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}
}

/**变量行工具 */
export class VariableLineUtils {

	static FirstAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<VariableLine>();
		const macro = option.macro;
		if (!line.saveLabel?.token?.text.startsWith("."))
			delete (option.macro);

		const label = LabelUtils.CreateLabel(line.saveLabel!.token, option, false);
		if (label) {
			label.labelType = LabelType.Variable;
			line.saveLabel!.label = label;
			delete (line.saveLabel?.token);
		} else {
			delete (line.saveLabel);
			line.compileType = LineCompileType.Error;
		}

		option.macro = macro;
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
		const label = line.saveLabel!.label;
		if (label && temp.success) {
			label.value = temp.value;
			line.saveLabel!.notFinish = true;
		}
	}
}