import { SplitLine } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { ICommonLine } from "./CommonLine";

export interface IVariableLine extends ICommonLine {
	splitLine?: SplitLine;
	label: ILabel;
	exprParts: ExpressionPart[];
}

export class VariableUtils {
	static FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as IVariableLine;
		let label = LabelUtils.CreateLabel(line.splitLine!.label, option);
		if (label) line.label = label;

		let parts = ExpressionUtils.SplitAndSort(line.splitLine!.expression);
		if (parts) line.exprParts = parts;

		delete(line.splitLine);
	}

	static ThirdAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as IVariableLine;
		ExpressionUtils.CheckLabelsAndShowError(line.exprParts);
	}
}