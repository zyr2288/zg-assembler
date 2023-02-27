import { Compiler } from "../Base/Compiler";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { HelperUtils } from "./HelperUtils";

export class HoverProvider {

	static Hover(filePath: string, lineNumber: number, lineText: string, currect: number) {

		let fileHash = Utils.GetHashcode(filePath);
		let line = Token.CreateToken(fileHash, lineNumber, 0, lineText);

		let result = { value: undefined as number | undefined, comment: undefined as string | undefined };

		const { content } = Compiler.GetContent(line);
		let range = HelperUtils.GetWord(content.text, currect);

		if (range.type === "none")
			return result;

		if (range.type === "value") {
			result.value = range.value;
			return result;
		}

		if (range.type !== "var")
			return result;

		content.text = range.text;
		content.start = currect - content.start;
		let label = LabelUtils.FindLabel(content);
		if (label) {
			result.value = label.value;
			result.comment = label.comment;
			return result;
		}

		// let macro = MacroUtils.FindMacro(content.text);
		// if (macro) {
		// 	result.comment = `${macro.comment}\n参数个数 ${macro.parameterCount}`;
		// }
		return result;
	}
}