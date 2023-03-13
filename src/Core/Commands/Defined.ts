import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { HighlightToken, LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

export class Defined {

	static Initialize() {
		Commands.AddCommand({
			name: ".DEF", min: 2, label: false,
			firstAnalyse: Defined.FirstAnalyse_Def,
			thirdAnalyse: Defined.ThirdAnalyse_Def,
			compile: Defined.Compile_Def
		});
	}

	private static FirstAnalyse_Def(option: CommandDecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let expressions: Token[] = line.tag;
		line.label = LabelUtils.CreateLabel(expressions[0], option);
		if (line.label)
			line.label.labelType = LabelType.Defined;

		let temp = ExpressionUtils.SplitAndSort(expressions[1]);
		if (temp)
			line.expParts[0] = temp;
		else
			line.compileType = LineCompileType.Error;

		line.GetTokens = Defined.GetTokens.bind(line);
		delete (line.tag);
	}

	private static ThirdAnalyse_Def(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		if (!line.label)
			return;

		let temp = ExpressionUtils.CheckLabelsAndShowError(line.expParts[0], option);
		if (temp) {
			line.compileType = LineCompileType.Error;
			return;
		}

		let temp2 = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.TryToGetResult, option);
		if (temp2.success)
			line.label.value = temp2.value;

	}

	private static Compile_Def(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;

		let type = Compiler.isLastCompile ? ExpressionResult.GetResultAndShowError : ExpressionResult.GetResultAndShowError;
		let temp = ExpressionUtils.GetExpressionValue(line.expParts[0], type);
		if (line.label && temp.success) {
			line.label.value = temp.value;
			line.compileType = LineCompileType.Finished;
		} else if (Compiler.isLastCompile) {
			line.compileType = LineCompileType.Error;
		}

	}

	private static GetTokens(this: ICommandLine) {
		let result: HighlightToken[] = [];

		// if (this.label)
		// 	result.push({ token: this.label.token, type: HighlightType.Defined });

		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}

}