import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Macro } from "../Commands/Macro";
import { HelperUtils, TokenResultTag } from "./HelperUtils";

export class HoverProvider {

	static Hover(filePath: string, lineNumber: number, lineText: string, currect: number) {

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const result = { value: undefined as number | undefined, comment: undefined as string | undefined };

		const temp = HelperUtils.FindMatchToken(fileHash, lineNumber, currect);
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
		}
		return result;
	}
}