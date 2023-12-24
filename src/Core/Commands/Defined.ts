import { Compiler } from "../Base/Compiler";
import { ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { CommandLine } from "../Lines/CommandLine";
import { HighlightToken, LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

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

		line.saveLabel = { token: expressions[0], label: {} as ILabel, notFinish: true };

		const label = LabelUtils.CreateLabel(line.saveLabel.token, option, false);
		if (label) {
			label.labelType = LabelType.Defined;
			label.comment = line.comment;
			line.saveLabel.label = label;
			delete(line.saveLabel.token);
		} else {
			delete(line.saveLabel);
		}

		const temp = ExpressionUtils.SplitAndSort(expressions[1]);
		if (temp)
			line.expParts[0] = temp;
		else
			line.compileType = LineCompileType.Error;

		line.GetTokens = Defined.GetTokens.bind(line);
		delete (line.tag);
	}

	private static ThirdAnalyse_Def(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const temp = ExpressionUtils.CheckLabelsAndShowError(line.expParts[0], option);
		if (temp) {
			line.compileType = LineCompileType.Error;
			return;
		}

		const label = line.saveLabel?.label;
		const analyseOption: ExpAnalyseOption = { analyseType: "Try" };
		const temp2 = ExpressionUtils.GetExpressionValue<number>(line.expParts[0], option, analyseOption);
		if (label && temp2.success)
			label.value = temp2.value;
	}

	private static Compile_Def(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const temp = ExpressionUtils.GetExpressionValue<number>(line.expParts[0], option);
		const label = line.saveLabel?.label;
		if (label && temp.success) {
			label.value = temp.value;
			line.compileType = LineCompileType.Finished;
		}
	}

	private static GetTokens(this: CommandLine) {
		const result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}

}