import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { LabelUtils } from "../Base/Label";
import { Localization } from "../I18n/Localization";
import { HelperUtils, TokenResultTag } from "./HelperUtils";

export class HoverProvider {

	static Hover(filePath: string, lineNumber: number, lineText: string, currect: number) {

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const result = { value: undefined as number | undefined, comment: undefined as string | undefined };

		const temp = HelperUtils.FindMatchToken(fileHash, lineNumber, lineText, currect);
		switch (temp.matchType) {
			case "Label":
				const label = LabelUtils.FindLabelWithHash(temp.tag as number, temp.macro);
				if (label) {
					result.comment = label.comment;
					result.value = label.value;
				}
				break;
			case "Macro":
				if (temp.matchToken) {
					const macro = Compiler.enviroment.allMacro.get(temp.matchToken.text);
					result.comment = macro?.comment;
				}
				break;
			case "Number":
				const tempValue = ExpressionUtils.GetNumber(temp.matchToken!.text);
				result.value = tempValue.value;
				break;
			case "DataGroup":
				const tag = temp.tag as TokenResultTag;
				result.value = tag.value;
				break;
			case "Command":
				result.comment = HoverProvider.HoverCommandTip(temp.matchToken!.text);
				break;
		}
		return result;
	}

	private static HoverCommandTip(command: string) {
		command = command.substring(1).toLowerCase();
		const tip = Localization.GetCommandTip(command as any);
		let result = tip.comment + "\n\n```\n";
		result += tip.format + "\n```";
		if (tip.exp)
			result += "\n---\n" + Localization.GetMessage("example") + "\n```\n" + tip.exp + "\n```";

		return result;
	}
}