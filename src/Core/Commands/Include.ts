import { Compiler } from "../Base/Compiler";
import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType, LineType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

export class Include {

	static Initialize() {

		if (!FileUtils.ReadFile) {
			console.error("File interface not implemented");
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


	private static async FirstAnalyse_Include(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let temp = await Include.ChechFile(option);
		if (!temp.exsist) {
			line.compileType = LineCompileType.Error;
			return;
		}

		if (!Compiler.enviroment.isCompileEnv)
			return;

		const hash = Compiler.enviroment.SetFile(temp.path);
		const data = await FileUtils.ReadFile(temp.path);
		let text = FileUtils.BytesToString(data);

		let allLines = Compiler.SplitTexts(hash, text);
		option.InsertLines(hash, option.lineIndex + 1, allLines);

		if (line.label) {
			line.type = LineType.OnlyLabel;
		} else {
			line.compileType = LineCompileType.Finished;
		}
	}

	private static async FirstAnalyse_Incbin(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let expressions: Token[] = line.tag;

		const temp = await Include.ChechFile(option);
		if (!temp.exsist) {
			line.compileType = LineCompileType.Error;
			return;
		}

		line.tag = temp.path;
		let temp2;
		if (expressions[1] && (temp2 = ExpressionUtils.SplitAndSort(expressions[1])))
			line.expParts[0] = temp2;

		if (expressions[2] && (temp2 = ExpressionUtils.SplitAndSort(expressions[2])))
			line.expParts[1] = temp2;

	}

	/**编译Incbin */
	private static async Compile_Incbin(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let temp = await FileUtils.ReadFile(line.tag);

		if (Commands.SetOrgAddressAndLabel(line))
			return;

		line.result = [];
		let start = 0;
		if (line.expParts[0]) {
			let result = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.GetResultAndShowError, option);
			if (result.success)
				start = result.value;
		}


		let length = temp.length;
		if (line.expParts[1]) {
			let result = ExpressionUtils.GetExpressionValue(line.expParts[1], ExpressionResult.GetResultAndShowError, option);
			if (result.success)
				length = result.value;
		}

		for (let i = start, j = 0; i < temp.length && j < length; ++i, ++j)
			line.result[j] = temp[i];

		line.compileType = LineCompileType.Finished;
		line.AddAddress();
	}

	/**检查是否满足表达式 */
	private static CheckString(text: string) {
		return /^"[^\"]*"$/.test(text)
	}

	/**检查文件是否存在 */
	private static async ChechFile(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let expressions: Token[] = line.tag;
		let result = { exsist: false, path: "" };

		if (!Include.CheckString(expressions[0].text)) {
			let errorMsg = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(expressions[0], errorMsg);
			line.compileType = LineCompileType.Error;
			return result;
		}

		let token = expressions[0].Substring(1, expressions[0].length - 2);
		let type = await FileUtils.PathType(token.text);
		if (type === "file") {
			result.exsist = true;
			result.path = token.text;
		}

		let file = Compiler.enviroment.GetFile(token.fileHash);
		let folder = await FileUtils.GetPathFolder(file);
		result.path = FileUtils.Combine(folder, token.text);

		type = (await FileUtils.PathType(result.path));
		result.exsist = type === "file";
		if (!result.exsist) {
			let errorMsg = Localization.GetMessage("File {0} is not exist", token.text);
			MyDiagnostic.PushException(token, errorMsg);
		}
		return result;
	}
}