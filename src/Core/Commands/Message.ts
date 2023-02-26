import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { DecodeOption } from "../Base/Options";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

export class Message {

	static Initialize() {
		Commands.AddCommand({
			name: ".MSG", min: 1, max: -1,
			firstAnalyse: Commands.FirstAnalyse_Common,
			thirdAnalyse: Message.ThirdAnalyse_Msg,
			compile: Message.Compiler_Msg
		});
	}

	private static ThirdAnalyse_Msg(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		for (let i = 1; i < line.expParts.length; ++i)
			if (ExpressionUtils.CheckLabelsAndShowError(line.expParts[i], option))
				line.compileType = LineCompileType.Error;

		return true;
	}

	private static Compiler_Msg(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;

		let values: number[] = [];
		let notSuccess = false;

		line.compileType = LineCompileType.Finished;
		for (let i = 0; i < line.expParts.length; ++i) {
			let temp = ExpressionUtils.GetExpressionValue(line.expParts[i], ExpressionResult.GetResultAndShowError, option);
			if (temp.success) {
				values[i] = temp.value;
			} else {
				line.compileType = LineCompileType.None;
				notSuccess = true;
			}
		}

		return !notSuccess;
	}

}