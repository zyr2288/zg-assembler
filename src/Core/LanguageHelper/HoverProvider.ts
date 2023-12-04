import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Macro } from "../Commands/Macro";
import { HelperUtils } from "./HelperUtils";

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
				result.value = temp.tag as number;
				break; 
		}
		return result;

		// const line = Token.CreateToken(fileHash, lineNumber, 0, lineText);
		// const { content } = Compiler.GetContent(line);
		// if (currect > content.start + content.text.length)
		// 	return result;

		// const word = HelperUtils.GetWord(content.text, currect, content.start);
		// const tempWord = word.leftText + word.rightText;
		// const value = ExpressionUtils.GetNumber(tempWord);
		// if (value.success) {
		// 	result.value = value.value;
		// 	return result;
		// }

		// const range = HelperUtils.GetRange(fileHash, lineNumber);
		// let macro: Macro | undefined;
		// if (range?.type === "Macro")
		// 	macro = Compiler.enviroment.allMacro.get(range.key);

		// const token = Token.CreateToken(fileHash, lineNumber, word.start, tempWord);
		// const labelResult = LabelUtils.FindLabel(token, macro);
		// if (labelResult) {
		// 	result.value = labelResult.label.value;
		// 	result.comment = labelResult.label.comment;
		// 	return result;
		// }

		// macro = Compiler.enviroment.allMacro.get(token.text);
		// if (!macro)
		// 	return result;

		// result.comment = macro.comment
		return result;
	}
}