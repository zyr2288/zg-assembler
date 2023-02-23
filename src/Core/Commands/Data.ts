import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { DecodeOption } from "../Base/Options";
import { CommonLineUtils, LineCompileType } from "../Lines/CommonLine";
import { ICommandLine } from "./Commands";

	export class Data {
		// static Initialize() {
		// 	Commands.AddCommand({
		// 		name: ".BASE", min: 1,
		// 		firstAnalyse: Commands.FirstAnalyse_Common,
		// 		thirdAnalyse: Commands.ThirdAnalyse_Common,
		// 		compile: BaseAndOrg.Compile_Base
		// 	});

		// 	Commands.AddCommand({
		// 		name: ".ORG", min: 1,
		// 		firstAnalyse: Commands.FirstAnalyse_Common,
		// 		thirdAnalyse: Commands.ThirdAnalyse_Common,
		// 		compile: BaseAndOrg.Compile_Org
		// 	});
		// }

		private static Compile_DB(option: DecodeOption) {

		}

		private static Compile_Data(dataLength: number, option: DecodeOption) {
			let line = option.allLines[option.lineIndex] as ICommandLine;

			if (!CommonLineUtils.AddressSet(line))
				return false;

			line.compileType = LineCompileType.Finished;
			line.result ??= [];
			let index = 0;

			for (let i = 0; i < line.expParts.length; i++) {
				const part: ExpressionPart[] = line.expParts[i]
				let temp = ExpressionUtils.GetExpressionValues(part, option);
				if (!temp.success) {
					line.compileType = LineCompileType.None;
					line.result.length += temp.values.length * dataLength;
				} else {
					for (let j = 0; j < temp.values.length; j++) {
						// let byteLength = Utils.DataByteLength(temp.values[j]);
						// if (Config.ProjectSetting.argumentOutOfRangeError && byteLength > dataLength) {
						// 	MyException.PushException(part[j].token, ErrorType.ArgumentOutofRange, ErrorLevel.ShowAndBreak);
						// 	return false;
						// }

						CommonLineUtils.SetResult(line, temp.values[j], index, dataLength);
					}
				}
				index += dataLength;
			}

			CommonLineUtils.AddressAdd(line);
			return true;
		}
	}