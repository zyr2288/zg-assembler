import { ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { Compiler } from "../Compiler/Compiler";
import { HelperUtils } from "./HelperUtils";

export class HoverProvider {

	static Hover(filePath: string, lineNumber: number, lineText: string, currect: number) {

		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		let result = "";

		const temp = HelperUtils.FindMatchToken(fileIndex, lineText, lineNumber, currect);
		let tempResult;
		switch (temp.type) {
			case "label":
				const label = LabelUtils.FindLabel(temp.token!, { fileIndex });
				if (label) {
					result = HelperUtils.FormatComment(label);
				}
				break;
			case "number":
				tempResult = ExpressionUtils.GetNumber(temp.token!.text)
				result = HelperUtils.FormatComment(tempResult);
				break;
			case "command":
				result = HelperUtils.FormatComment({ commadTip: temp.token!.text });
				break;
			case "macro":
				const macro = Compiler.enviroment.allMacro.get(temp.token!.text);
				if (macro) {
					result = HelperUtils.FormatComment({ macro, comment: macro.comment });
				}
				break;
		}

		return result;
	}

}