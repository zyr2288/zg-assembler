import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

/**.DB .DW .DL 命令 */
export class Data {

	static Initialize() {
		Commands.AddCommand({
			name: ".DB", min: 1, max: -1,
			firstAnalyse: Commands.FirstAnalyse_Common,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: Data.Compile_DB
		});

		Commands.AddCommand({
			name: ".DW", min: 1, max: -1,
			firstAnalyse: Commands.FirstAnalyse_Common,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: Data.Compile_DW
		});

		Commands.AddCommand({
			name: ".DL", min: 1, max: -1,
			firstAnalyse: Commands.FirstAnalyse_Common,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: Data.Compile_DL
		});
	}

	private static Compile_DB(option: DecodeOption) {
		Data.Compile_Data(1, option);
	}

	private static Compile_DW(option: DecodeOption) {
		Data.Compile_Data(2, option);
	}

	private static Compile_DL(option: DecodeOption) {
		Data.Compile_Data(4, option);
	}

	private static Compile_Data(dataLength: number, option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;

		if (Commands.SetOrgAddressAndLabel(line))
			return;

		line.result ??= [];
		line.compileType = LineCompileType.Finished;
		let index = 0;
		let finalCompile = Compiler.isLastCompile ? ExpressionResult.GetResultAndShowError : ExpressionResult.TryToGetResult;

		for (let i = 0; i < line.expParts.length; i++) {
			const part: ExpressionPart[] = line.expParts[i];
			let temp = ExpressionUtils.GetExpressionValues(part, finalCompile, option);
			if (!temp.success) {
				line.compileType = LineCompileType.None;
				line.result.length += temp.values.length * dataLength;
				index += line.result.length;
			} else {
				for (let j = 0; j < temp.values.length; j++) {
					let tempLength = Utils.GetNumberByteLength(temp.values[j]);
					let tempValue = Compiler.SetResult(line, temp.values[j], index, dataLength);
					index += dataLength;
					if (tempLength > dataLength || temp.values[j] < 0) {
						let errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.values[j], tempValue);
						let token = ExpressionUtils.CombineExpressionPart(part);
						MyDiagnostic.PushWarning(token, errorMsg);
					}
				}
			}
		}

		Compiler.AddAddress(line);
	}
}