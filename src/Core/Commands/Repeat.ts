import { ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
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
		const expressions: Token[] = line.tag;
		line.tag = include![1].index - include![0].index;

		const temp = ExpressionUtils.SplitAndSort(expressions[0]);
		if (temp)
			line.expParts[0] = temp;
		else
			line.compileType = LineCompileType.Error;

		option.GetLine(include![1].index).compileType = LineCompileType.Finished;
	}

	private static Compile(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const analyseOption: ExpAnalyseOption = { analyseType: "GetAndShowError" };

		const result = ExpressionUtils.GetExpressionValue<number>(line.expParts[0], option, analyseOption);
		if (!result.success)
			return;

		line.compileType = LineCompileType.Finished;

		const length: number = line.tag;
		let resultValue = result.value;

		option.allLines.splice(option.lineIndex, 1);
		const tempLines = option.allLines.splice(option.lineIndex, length);
		tempLines.splice(tempLines.length - 1, 1);
		while (resultValue > 0) {
			const tempArray = Utils.DeepClone(tempLines);
			option.allLines.splice(option.lineIndex, 0, ...tempArray);
			resultValue--;
		}
		option.lineIndex--;
	}
}