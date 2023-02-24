import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
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
			firstAnalyse: Include.FirstAnalyse,
			compile: Include.Compile_Include
		});

		Commands.AddCommand({
			name: ".INCBIN", min: 1, max: 3,
			firstAnalyse: Include.FirstAnalyse,
			compile: Include.Compile_Include
		});
	}

	private static FirstAnalyse(option: CommandDecodeOption) {
		return true;
	}

	private static Compile_Include(option: DecodeOption) {
		return true;
	}
}