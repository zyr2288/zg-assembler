import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Platform } from "../Platform/Platform";


export interface WordType {
	startColumn: number;
	text: string;
	type: "path" | "var" | "value" | "none";
	value?: number
}

export class HelperUtils {

	//#region 获取光标所在字符
	/**
	 * 获取光标所在字符
	 * @param lineText 一行文本
	 * @param currect 当前光标未知
	 * @returns 
	 */
	static GetWord(lineText: string, currect: number, start = 0) {

		let inString = false;
		let lastString = "";

		let range = [0, 0];

		const match = "\t +-*/&|!^#,()[]{}";
		let findMatch = false;

		for (let i = 0; i < lineText.length; ++i) {

			if (inString && lineText !== "\"") {
				lastString = lineText[i];
				continue;
			}

			if (lineText[i] === "\"") {
				if (!inString) {
					inString = true;
					range[0] = i;
				} else if (lastString !== "\\") {
					inString = false;
					range[1] = i;
				}
				continue;
			} else if (match.includes(lineText[i])) {
				range[1] = i;
				findMatch = true;
			}

			if (currect >= range[0] && currect <= range[1])
				break;

			if (findMatch) {
				range[0] = i + 1;
				findMatch = false;
			}

			lastString = lineText[i];
		}

		let rangeText = [lineText.substring(range[0], currect), lineText.substring(currect, range[1])];
		if (currect === lineText.length)
			rangeText[1] = "";

		return { rangeText, start: range[0] + start };
	}
	//#endregion 获取光标所在字符

	//#region 获取Label注释以及值
	/**获取Label注释以及值 */
	static GetLabelCommentAndValue(text: string, currect: number, lineNumber: number, filePath: string) {

		// let fileHash = Utils.GetHashcode(filePath);
		// let lineText = Token.CreateToken(fileHash, lineNumber, 0, text);

		// let result = { value: <number | undefined>undefined, comment: <string | undefined>undefined };
		// const { content, comment } = Compiler.GetContent(lineText);

		// let range = HelperUtils.GetWord(content.text, currect);
		// if (range.type == "none")
		// 	return result;

		// if (range.type == "value") {
		// 	result.value = range.value;
		// 	return result;
		// }

		// if (range.type != "var") {
		// 	return result;
		// }

		// content.text = range.text;
		// content.start = currect - content.start;
		// let label = LabelUtils.FindLabel(content);
		// if (label) {
		// 	if (label.labelType === LabelType.None)
		// 		return result;

		// 	result.value = label.value;
		// 	result.comment = label.comment;
		// 	return result;
		// }

		// let macro = MacroUtils.FindMacro(content.text);
		// if (macro) 
		// 	result.comment = `${macro.comment}\n参数个数 ${macro.parameterCount}`;

		// return result;
	}
	//#endregion 获取Label注释以及值

}
