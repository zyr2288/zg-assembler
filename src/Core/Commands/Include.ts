import { Compiler } from "../Base/Compiler";
import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { MyException } from "../Base/MyException";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Localization } from "../I18n/Localization";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

export class Include {

	static Initialize() {
		if (!FileUtils.ReadFile) {
			console.error("读文件接口尚未实现");
			return;
		}

		Commands.AddCommand({
			name: ".INCLUDE", min: 1,
			firstAnalyse: Include.FirstAnalyse_Include,
		});

		Commands.AddCommand({
			name: ".INCBIN", min: 1, max: 3,
			firstAnalyse: Include.FirstAnalyse_Incbin,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: Include.Compile_Incbin
		});
	}

	private static async FirstAnalyse_Include(option: CommandDecodeOption) {
		let temp = await Include.ChechFile(option);
		if (!temp.exsist)
			return;

		if (Compiler.enviroment.isCompile) {

		}
	}

	private static async FirstAnalyse_Incbin(option: CommandDecodeOption) {
		let temp = await Include.ChechFile(option);
		if (!temp.exsist)
			return;

		let line = option.allLines[option.lineIndex] as ICommandLine;
		line.tag = temp.path;
		let temp2;
		if (option.expressions[1] && (temp2 = ExpressionUtils.SplitAndSort(option.expressions[1])))
			line.expParts[0] = temp2;

		if (option.expressions[2] && (temp2 = ExpressionUtils.SplitAndSort(option.expressions[2])))
			line.expParts[1] = temp2;

	}

	/**编译Incbin */
	private static async Compile_Incbin(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		let temp = await FileUtils.ReadFile(line.tag);

		line.SetAddress();

		let start = 0;
		let result = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.GetResultAndShowError, option);
		if (result.success)
			start = result.value;

		let length = temp.length;
		result = ExpressionUtils.GetExpressionValue(line.expParts[1], ExpressionResult.GetResultAndShowError, option);
		if (result.success)
			length = result.value;

		for (let i = start, j = 0; i < temp.length && j < length; ++i, ++j)
			line.result[j] = temp[i];

		line.AddAddress();
		line.compileType = LineCompileType.Finished;
	}

	/**检查是否满足表达式 */
	private static CheckString(text: string) {
		return /^"[^\"]*"$/.test(text)
	}

	/**检查文件是否存在 */
	private static async ChechFile(option: CommandDecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		let result = { exsist: false, path: "" };

		if (!Include.CheckString(option.expressions[0].text)) {
			let errorMsg = Localization.GetMessage("Command arguments error");
			MyException.PushException(option.expressions[0], errorMsg);
			line.compileType = LineCompileType.Error;
			return result;
		}

		let token = option.expressions[0].Substring(1, option.expressions[0].length - 2);
		if (await FileUtils.PathType(token.text) === "file") {
			result.exsist = true;
			result.path = token.text;
		}

		let file = Compiler.enviroment.GetFile(token.fileHash);
		let folder = await FileUtils.GetPathFolder(file);
		result.path = FileUtils.Combine(folder, token.text);

		result.exsist = (await FileUtils.PathType(result.path)) === "file";
		if (!result.exsist) {
			let errorMsg = Localization.GetMessage("File {0} is not exist", option.expressions[0].text);
			MyException.PushException(option.expressions[0], errorMsg);
		}
		return result;
	}
}