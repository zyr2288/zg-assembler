import { CompileOption } from "../Base/CompileOption";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { ICommand } from "./Command";

export type HexTag = Token[];

export class HexCommand implements ICommand {
	start = { name: ".HEX", min: 1, max: 1 };

	AnalyseFirst(option: CompileOption) {
		this.Analyse(option);
	}

	Compile(option: CompileOption) {
		const line = this.Analyse(option);
		if (!line)
			return;

		line.lineResult.SetAddress();
		
		const tag = line.tag as HexTag;
		for (let i = 0; i < tag.length; i++) {
			line.lineResult.result.push(...this.GetHex(tag[i].text));
		}

		line.lineResult.AddAddress();
		line.lineType = LineType.Finished;
	}

	private Analyse(option:CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const token = line.arguments[0];
		if (!/^[ 0-9a-fA-F]+$/g.test(token.text)) {
			const error = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(token, error);
			line.lineType = LineType.Error;
			return;
		}

		line.tag = token.Split(/\s+/g);
		return line;
	}

	private GetHex(text: string) {
		const result: number[] = [];
		for (let i = 0; i < text.length; i += 2) {
			const value = parseInt(text.substring(i, i + 2), 16);
			result.push(value);
		}
		return result;
	}
}
