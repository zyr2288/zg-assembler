import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Utils } from "../Base/Utils";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

export class Repeat {

	static Initialize() {
		Commands.AddCommand({
			name: ".REPEAT", end: ".ENDR", min: 1, label: false, nested: true,
			firstAnalyse: Repeat.FirstAnalyse,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: Repeat.Compile_Repeat
		});
	}

	private static FirstAnalyse(option: CommandDecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		line.tag = option.includeCommandLines![1].index - option.includeCommandLines![0].index;

		let temp = ExpressionUtils.SplitAndSort(option.expressions[0]);
		if (temp)
			line.expParts[0] = temp;
		else
			line.compileType = LineCompileType.Error;
	}

	private static Compile_Repeat(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let result = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.GetResultAndShowError, option);
		if (!result.success || result.value < 0)
			return;

		let length: number = line.tag;
		option.allLines.splice(option.lineIndex, 1);
		let tempLines = option.allLines.splice(option.lineIndex, length);
		tempLines.splice(tempLines.length - 1, 1);
		while (result.value != 0) {
			let tempArray = tempLines.map(value => Utils.DeepClone(value));
			option.allLines.splice(option.lineIndex, 0, ...tempArray);
			result.value--;
		}
		option.lineIndex--;
	}
}