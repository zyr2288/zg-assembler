import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
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
			compile: Include.Compile_Include
		});

		Commands.AddCommand({
			name: ".INCBIN", min: 1, max: 3,
			firstAnalyse: Include.FirstAnalyse_Incbin,
			compile: Include.Compile_Include
		});
	}

	private static async FirstAnalyse_Include(option: CommandDecodeOption) {
		let temp = await Include.ChechFile(option);
		if (!temp.exsist)
			return false;

		return true;
	}

	private static async FirstAnalyse_Incbin(option: CommandDecodeOption) {
		let temp = await Include.ChechFile(option);
		if (!temp.exsist)
			return false;

		
			
		return true;
	}

	/**编译Include */
	private static Compile_Include(option: DecodeOption) {
		return true;
	}

	private static Compile_Incbin(option: DecodeOption) {

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