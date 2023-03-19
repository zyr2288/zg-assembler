import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

/**.HEX 十六进制命令 */
export class Hexadecimal {
	static Initialize() {
		Commands.AddCommand({
			name: ".HEX", min: 1,
			firstAnalyse: Hexadecimal.FirstAnalyse_Hex,
			compile: Hexadecimal.Compile_Hex
		});
	}

	private static FirstAnalyse_Hex(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let expressions: Token[] = line.tag;
		line.tag = expressions[0];

		if (!/^[ 0-9a-fA-F]+$/.test(expressions[0].text)) {
			let errorMsg = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(expressions[0], errorMsg);
			line.compileType = LineCompileType.Error;
		}
	}

	// 编译 HEX 命令
	private static Compile_Hex(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		if (Commands.SetOrgAddressAndLabel(option))
			return;

		let token = line.tag as Token;

		let tokens = token.Split(/\s+/g);
		let temp = "";
		for (let i = 0; i < tokens.length; ++i) {
			for (let j = 0; j < tokens[i].text.length; j += 2) {
				temp = tokens[i].text.substring(j, j + 2);
				line.result.push(parseInt(temp, 16));
			}
		}

		line.compileType = LineCompileType.Finished;
		line.AddAddress();
	}
}