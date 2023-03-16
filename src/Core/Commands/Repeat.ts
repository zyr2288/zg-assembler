import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { DecodeOption, IncludeLine } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

export class Repeat {

	static Initialize() {
		Commands.AddCommand({
			name: ".REPEAT", end: ".ENDR", min: 1, label: false, nested: true,
			firstAnalyse: Repeat.FirstAnalyse,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: Repeat.Compile
		});
	}

	private static FirstAnalyse(option: DecodeOption, include?: IncludeLine[]) {
		const line = option.GetCurrectLine<CommandLine>();
		let expressions: Token[] = line.tag;
		line.tag = include![1].index - include![0].index;

		let temp = ExpressionUtils.SplitAndSort(expressions[0]);
		if (temp)
			line.expParts[0] = temp;
		else
			line.compileType = LineCompileType.Error;

		option.GetLine(include![1].index).compileType = LineCompileType.Finished;
	}

	private static Compile(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let result = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.GetResultAndShowError, option);
		if (!result.success)
			return;

		line.compileType = LineCompileType.Finished;

		let length: number = line.tag;
		option.allLines.splice(option.lineIndex, 1);
		let tempLines = option.allLines.splice(option.lineIndex, length);
		tempLines.splice(tempLines.length - 1, 1);
		while (result.value > 0) {
			let tempArray = tempLines.map(value => Utils.DeepClone(value));
			option.allLines.splice(option.lineIndex, 0, ...tempArray);
			result.value--;
		}
		option.lineIndex--;


	}
}