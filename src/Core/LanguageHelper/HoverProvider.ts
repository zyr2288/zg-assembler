import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { HightlightRange } from "../Lines/CommonLine";
import { HelperUtils } from "./HelperUtils";

export class HoverProvider {

	static Hover(filePath: string, lineNumber: number, lineText: string, currect: number) {

		let result = { value: undefined as number | undefined, comment: undefined as string | undefined };

		let temp = HelperUtils.GetWord(lineText, currect);
		let text = temp.rangeText.join("");
		var value = ExpressionUtils.GetNumber(text);
		if (value.success) {
			result.value = value.value;
			return result;
		}

		let fileHash = Utils.GetHashcode(filePath);
		let ranges = Compiler.enviroment.GetRange(fileHash);
		let range: HightlightRange | undefined;
		for (let i = 0; i < ranges.length; ++i) {
			if (lineNumber > ranges[i].end || lineNumber < ranges[i].start)
				continue;

			range = ranges[i];
			break;
		}

		// const { content } = Compiler.GetContent(line);
		// let range = HelperUtils.GetWord(content.text, currect);

		// if (range.type === "none")
		// 	return result;

		// if (range.type === "value") {
		// 	result.value = range.value;
		// 	return result;
		// }

		// if (range.type !== "var")
		// 	return result;

		// content.text = range.text;
		// content.start = currect - content.start;
		// let label = LabelUtils.FindLabel(content);
		// if (label) {
		// 	result.value = label.value;
		// 	result.comment = label.comment;
		// 	return result;
		// }

		// let macro = MacroUtils.FindMacro(content.text);
		// if (macro) {
		// 	result.comment = `${macro.comment}\n参数个数 ${macro.parameterCount}`;
		// }
		return result;
	}
}