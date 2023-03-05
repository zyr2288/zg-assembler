import { MyDiagnostic } from "../Base/MyException";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

/**.HEX 十六进制命令 */
export class Hexadecimal {
	static Initialize() {
		Commands.AddCommand({
			name: ".HEX",
			min: 1,
			firstAnalyse: Hexadecimal.FirstAnalyse_Hex,
			compile: Hexadecimal.Compile_Hex
		});
	}

	private static FirstAnalyse_Hex(option: CommandDecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		let token = option.expressions[0];
		line.tag = token;

		if (!/^[ 0-9a-fA-F]+$/.test(token.text)) {
			let errorMsg = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(token, errorMsg);
			line.compileType = LineCompileType.Error;
			return;
		}

		return;
	}

	private static Compile_Hex(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		let token = line.tag as Token;

		let tokens = token.Split(/s+/g);
		let temp = "";
		for (let i = 0; i < tokens.length; ++i) {
			for (let j = 0; j < tokens[i].text.length; j += 2) {
				temp = tokens[i].text.substring(j, j + 2);
				line.result.push(parseInt(temp, 16));
			}
		}

		return;
	}
}