import { ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { CommandLine } from "../Lines/CommandLine";
import { HighlightToken, LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

export type DefinedTag = ILabel;

export class Defined {

	static Initialize() {
		Commands.AddCommand({
			name: ".DEF", min: 2, label: false,
			firstAnalyse: Defined.FirstAnalyse_Def,
			thirdAnalyse: Defined.ThirdAnalyse_Def,
			compile: Defined.Compile_Def
		});
	}

	private static FirstAnalyse_Def(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const expressions: Token[] = line.tag;

		let labelToken = expressions[0];

		const label = LabelUtils.CreateLabel(labelToken, option, false);
		if (label) {
			label.labelType = LabelType.Defined;
			label.comment = line.comment;
			line.tag = label;
		}

		const temp = ExpressionUtils.SplitAndSort(expressions[1]);
		if (temp)
			line.expression[0] = temp;
		else
			line.compileType = LineCompileType.Error;

		line.GetTokens = Defined.GetTokens.bind(line);
	}

	private static ThirdAnalyse_Def(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const temp = ExpressionUtils.CheckLabelsAndShowError(line.expression[0], option);
		if (temp) {
			line.compileType = LineCompileType.Error;
			return;
		}

		const label = line.tag as DefinedTag;
		const analyseOption: ExpAnalyseOption = { analyseType: "Try" };
		const temp2 = ExpressionUtils.GetExpressionValue<number>(line.expression[0], option, analyseOption);
		if (label && temp2.success)
			label.value = temp2.value;
	}

	private static Compile_Def(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const temp = ExpressionUtils.GetExpressionValue<number>(line.expression[0], option);
		const label = line.tag as DefinedTag;
		if (label && temp.success) {
			label.value = temp.value;
			line.compileType = LineCompileType.Finished;
		}
	}

	private static GetTokens(this: CommandLine) {
		const result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expression));
		return result;
	}

}