import { SplitLine } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { CommonLineUtils, HighlightToken, HighlightType, ICommonLine } from "./CommonLine";

export interface IVariableLine extends ICommonLine {
	splitLine?: SplitLine;
	label: ILabel;
	exprParts: ExpressionPart[];
}

export class VariableLineUtils {
	static FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as IVariableLine;
		let label = LabelUtils.CreateLabel(line.splitLine!.label, option);
		if (label) {
			line.label = label;
			line.label.labelType = LabelType.Variable;
		}

		let parts = ExpressionUtils.SplitAndSort(line.splitLine!.expression);
		if (parts) line.exprParts = parts;

		delete (line.splitLine);
	}

	static ThirdAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as IVariableLine;
		ExpressionUtils.CheckLabelsAndShowError(line.exprParts);

		line.GetTokens = VariableLineUtils.GetTokens.bind(line);
	}

	//#region 基础获取命令的高亮Token
	static GetTokens(this: IVariableLine) {
		let result: HighlightToken[] = [];

		if (this.label)
			result.push({ token: this.label.token, type: HighlightType.Variable });

		result.push(...ExpressionUtils.GetHighlightingTokens([this.exprParts]));
		return result;
	}
	//#endregion 基础获取命令的高亮Token
}