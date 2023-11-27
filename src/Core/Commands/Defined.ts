import { Compiler } from "../Base/Compiler";
import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
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
		let expressions: Token[] = line.tag;

		line.labelToken = expressions[0];

		let labelMark = LabelUtils.CreateLabel(line.labelToken, option);
		if (labelMark) {
			labelMark.label.labelType = LabelType.Defined;
			labelMark.label.comment = line.comment;
			line.labelHash = labelMark.hash;
		}

		let temp = ExpressionUtils.SplitAndSort(expressions[1]);
		if (temp)
			line.expParts[0] = temp;
		else
			line.compileType = LineCompileType.Error;

		line.GetTokens = Defined.GetTokens.bind(line);
		delete (line.tag);
	}

	private static ThirdAnalyse_Def(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let temp = ExpressionUtils.CheckLabelsAndShowError(line.expParts[0], option);
		if (temp) {
			line.compileType = LineCompileType.Error;
			return;
		}

		let label = LabelUtils.FindLabelWithHash(line.labelHash, option.macro);
		let temp2 = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.TryToGetResult, option);
		if (label && temp2.success)
			label.value = temp2.value;
	}

	private static Compile_Def(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let type = Compiler.isLastCompile ? ExpressionResult.GetResultAndShowError : ExpressionResult.GetResultAndShowError;
		let temp = ExpressionUtils.GetExpressionValue(line.expParts[0], type);
		let label = LabelUtils.FindLabelWithHash(line.labelHash, option.macro);
		if (label && temp.success) {
			label.value = temp.value;
			line.compileType = LineCompileType.Finished;
		} else if (Compiler.isLastCompile) {
			line.compileType = LineCompileType.Error;
		}
	}

	private static GetTokens(this: CommandLine) {
		let result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}

}