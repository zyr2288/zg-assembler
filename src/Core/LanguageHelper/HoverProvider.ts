import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { LabelUtils } from "../Base/Label";
import { Localization } from "../I18n/Localization";
import { CommentHelper } from "./CommentHelper";
import { HelperUtils, TokenResultTag } from "./HelperUtils";

export class HoverProvider {

	static Hover(filePath: string, lineNumber: number, lineText: string, currect: number) {

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		let result = "";
		let changeTip = true;

		const temp = HelperUtils.FindMatchToken(fileHash, lineNumber, lineText, currect);
		switch (temp.matchType) {
			case "Label":
				const label = LabelUtils.FindLabel(temp.matchToken, temp.macro?.CreateInstance());
				if (label) {
					result = CommentHelper.FormatComment(label);
				}
				break;
			case "Macro":
				if (temp.matchToken) {
					const macro = Compiler.enviroment.allMacro.get(temp.matchToken.text);
					result = CommentHelper.FormatComment({ macro, comment: macro?.comment });
				}
				break;
			case "Number":
				const tempValue = ExpressionUtils.GetNumber(temp.matchToken!.text);
				result = CommentHelper.FormatComment({ value: tempValue.value });
				break;
			case "DataGroup":
				const tag = temp.tag as TokenResultTag;
				result = CommentHelper.FormatComment({ value: tag.value });
				break;
			case "Command":
				result = CommentHelper.FormatComment({ commadTip: temp.matchToken!.text });
				break;
		}

		return result;
	}

}