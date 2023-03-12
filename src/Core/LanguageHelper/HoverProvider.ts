import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { IMacro } from "../Commands/Macro";
import { HightlightRange } from "../Lines/CommonLine";
import { HelperUtils } from "./HelperUtils";

export class HoverProvider {

	static Hover(filePath: string, lineNumber: number, lineText: string, currect: number) {

		let result = { value: undefined as number | undefined, comment: undefined as string | undefined };
		let fileHash = Utils.GetHashcode(filePath);
		const line = Token.CreateToken(fileHash, lineNumber, 0, lineText);
		const { content } = Compiler.GetContent(line);
		if (currect > content.start + content.text.length)
			return result;

		let word = HelperUtils.GetWord(content.text, currect, content.start);
		let tempWord = word.rangeText.join("");
		let value = ExpressionUtils.GetNumber(tempWord);
		if (value.success) {
			result.value = value.value;
			return result;
		}

		let range = HelperUtils.GetRange(fileHash, lineNumber);
		let macro: IMacro | undefined;
		if (range?.type === "Macro")
			macro = Compiler.enviroment.allMacro.get(range.key);

		let token = Token.CreateToken(fileHash, lineNumber, word.start, tempWord);
		let label = LabelUtils.FindLabel(token, macro);
		if (label) {
			result.value = label.value;
			result.comment = label.comment;
			return result;
		}

		macro = Compiler.enviroment.allMacro.get(token.text);
		if (!macro)
			return result;

		result.comment = macro.comment
		return result;
	}
}