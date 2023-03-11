import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { MatchNames, Platform } from "../Platform/Platform";

export interface MatchRange {
	type: "none" | "command" | "instruction" | "variable";
	start: number;
	text: string;
}

export class HelperUtils {

	//#region 基础分割行
	/**
	 * 基础分割行
	 * @param lineText 一行文本
	 * @returns 分割结果
	 */
	static BaseSplit(lineText: string, start = 0): MatchRange {
		let result: MatchRange = { type: "none", start: 0, text: "" };
		let match = new RegExp(Platform.regexString, "ig").exec(lineText);
		if (match?.groups?.[MatchNames.command]) {
			result.type = "command";
			result.text = match.groups[MatchNames.command].toUpperCase();
		} else if (match?.groups?.[MatchNames.instruction]) {
			result.type = "instruction";
			result.text = match.groups[MatchNames.instruction].toUpperCase();
		} else if ((match?.groups?.[MatchNames.variable])) {
			result.type = "variable"
		}

		if (match)
			result.start = match[0].indexOf(result.text) + match.index + start;

		return result;
	}
	//#endregion 基础分割行

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

		const match = "\t +-*/&|!^#,()[]{}<>";
		let findEnd = false;

		for (let i = 0; i < lineText.length; ++i) {

			if (inString && lineText[i] !== "\"") {
				lastString = lineText[i];
				continue;
			}

			if (lineText[i] === "\"") {
				if (!inString) {
					inString = true;
					range[0] = i;
				} else if (lastString !== "\\") {
					inString = false;
					range[1] = i + 1;
					findEnd = true;
				}
			} else if (match.includes(lineText[i])) {
				findEnd = !findEnd
				if (findEnd)
					range[1] = i;
				else
					range[0] = i + 1;
			}

			if (findEnd) {
				if (currect >= range[0] && currect <= range[1]) {
					break;
				} else {
					findEnd = false;
					range[0] = i + 1;
				}
			}

			lastString = lineText[i];
		}

		if (!findEnd)
			range[1] = lineText.length;

		let rangeText = [
			lineText.substring(range[0], currect),
			lineText.substring(currect, range[1])
		];

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

	//#region 获取行所在范围
	static GetRange(fileHash: number, lineNumber: number) {
		let ranges = Compiler.enviroment.GetRange(fileHash);
		let rangeType = undefined;
		for (let i = 0; i < ranges.length; ++i) {
			if (lineNumber < ranges[i].start || lineNumber > ranges[i].end)
				continue;

			rangeType = ranges[i];
			break;
		}
		return rangeType;
	}
	//#endregion 获取行所在范围

}
