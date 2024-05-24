import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

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
		const line = option.GetCurrectLine<CommandLine>();
		if (Commands.SetOrgAddressAndLabel(option))
			return;

		line.compileType = LineCompileType.Finished;
		let index = 0;

		for (let i = 0; i < line.expression.length; i++) {
			const part = line.expression[i];
			const temp = ExpressionUtils.GetExpressionValue<number[]>(part, option, analyseOption);
			if (!temp.success) {
				line.compileType = LineCompileType.None;
				line.result.length += temp.value.length * dataLength;
				index += line.result.length;
			} else {
				for (let j = 0; j < temp.value.length; j++) {
					const tempLength = Utils.GetNumberByteLength(temp.value[j]);
					const tempValue = line.SetResult(temp.value[j], index, dataLength);
					index += dataLength;
					if (tempLength > dataLength || temp.value[j] < 0) {
						const errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.value[j], tempValue);
						const token = ExpressionUtils.CombineExpressionPart(part);
						MyDiagnostic.PushWarning(token, errorMsg);
					}
				}
			}
		}

		line.AddAddress();
	}
}