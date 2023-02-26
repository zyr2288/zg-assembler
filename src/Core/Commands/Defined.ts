import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { HighlightToken, HighlightType, LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

export class Defined {

	static Initialize() {
		Commands.AddCommand({
			name: ".DEF",
			min: 2,
			firstAnalyse: Defined.FirstAnalyse_Def,
			thirdAnalyse: Defined.ThirdAnalyse_Def,
			compile: Defined.Compile_Def
		})
	}

	private static FirstAnalyse_Def(option: CommandDecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		line.label = LabelUtils.CreateLabel(option.expressions[0], option);
		if (line.label) line.label.labelType = LabelType.Defined;

		let temp = ExpressionUtils.SplitAndSort(option.expressions[1]);
		if (temp) line.expParts[0] = temp;

		line.GetTokens = Defined.GetTokens.bind(line);
		return true;
	}

	private static ThirdAnalyse_Def(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		if (!line.label)
			return true;

		let temp = ExpressionUtils.CheckLabelsAndShowError(line.expParts[0], option);
		if (!temp)
			return true;

		let temp2 = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.TryToGetResult, option);
		if (temp2.success)
			line.label.value = temp2.value;

		return true;
	}

	private static Compile_Def(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;

		let tag = line.tag as ExpressionPart[];

		let temp = ExpressionUtils.GetExpressionValue(tag, ExpressionResult.GetResultAndShowError);
		let label = LabelUtils.FindLabel(line.label!.token, option);
		if (label && temp.success) {
			label.value = temp.value;
			return true;
		}
		line.compileType = LineCompileType.Error;
		return false;
	}

	private static GetTokens(this: ICommandLine) {
		let result: HighlightToken[] = [];

		if (this.label)
			result.push({ token: this.label.token, type: HighlightType.Defined });

		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}

}