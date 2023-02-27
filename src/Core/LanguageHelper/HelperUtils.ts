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

	static fileUpdateFinished = false;

	//#region 获取光标所在字符
	/**
	 * 获取光标所在字符
	 * @param lineText 一行文本
	 * @param currect 当前光标未知
	 * @returns 
	 */
	static GetWord(lineText: string, currect: number, start = 0): WordType {

		currect -= start;
		if (currect > lineText.length) {
			return { startColumn: currect, text: "", type: "none" };
		}

		// 获取文件
		let preMatch = /(^|\s+)\.INC(LUDE|BIN)\s+"[^\"]"/ig.exec(lineText);
		if (preMatch) {
			let index = preMatch[0].indexOf("\"");
			return {
				startColumn: preMatch.index + index,
				text: preMatch[0].substring(index + 1, preMatch[0].length - 1),
				type: "path"
			};
		}

		let regex = new RegExp(Platform.regexString, "ig");
		let leftMatch = regex.exec(lineText.substring(0, currect));

		regex = new RegExp(Platform.regexString, "ig");
		let rightMatch = regex.exec(lineText);

		let temp: RegExpExecArray | null;
		if (rightMatch && currect <= rightMatch.index && (temp = LabelUtils.namelessLabelRegex.exec(lineText.substring(0, rightMatch.index)))) {
			// 临时变量
			return { startColumn: temp.index, text: temp[0], type: "var" };
		} else if (leftMatch && (temp = LabelUtils.namelessLabelRegex.exec(lineText.substring(leftMatch.index + leftMatch[0].length))) != null) {
			// 临时变量
			return { startColumn: leftMatch.index + leftMatch[0].length, text: temp[0], type: "var" };
		} else {
			let left = Utils.StringReverse(lineText.substring(0, currect));
			let right = lineText.substring(currect);

			const regexStr = /\s|\<|\>|\+|\-|\*|\/|\,|\(|\)|\=|\#|&|\||\^|$/g;

			let m1 = new RegExp(regexStr).exec(left)!;
			let m2 = new RegExp(regexStr).exec(right)!;

			let leftIndex = left.length - m1.index;
			left = Utils.StringReverse(left.substring(0, m1.index));
			right = right.substring(0, m2.index);
			[1, 2, 3].map(n => n + 1);
			let resultText = left + right;
			let number = ExpressionUtils.GetNumber(resultText);
			if (number.success)
				return { startColumn: leftIndex, text: resultText, type: "value", value: number.value };

			return { startColumn: leftIndex, text: resultText, type: "var" };
		}
	}
	//#endregion 获取光标所在字符

	//#region 获取Label注释以及值
	/**获取Label注释以及值 */
	static GetLabelCommentAndValue(text: string, currect: number, lineNumber: number, filePath: string) {

		let fileHash = Utils.GetHashcode(filePath);
		let lineText = Token.CreateToken(fileHash, lineNumber, 0, text);

		let result = { value: <number | undefined>undefined, comment: <string | undefined>undefined };
		const { content, comment } = Compiler.GetContent(lineText);

		let range = HelperUtils.GetWord(content.text, currect);
		if (range.type == "none")
			return result;

		if (range.type == "value") {
			result.value = range.value;
			return result;
		}

		if (range.type != "var") {
			return result;
		}

		content.text = range.text;
		content.start = currect - content.start;
		let label = LabelUtils.FindLabel(content);
		if (label) {
			if (label.labelType === LabelType.None)
				return result;

			result.value = label.value;
			result.comment = label.comment;
			return result;
		}

		// let macro = MacroUtils.FindMacro(content.text);
		// if (macro) 
		// 	result.comment = `${macro.comment}\n参数个数 ${macro.parameterCount}`;
		
		return result;
	}
	//#endregion 获取Label注释以及值

	//#region 等待文件更新完成
	static WaitFileUpdateFinished(): Promise<void> {
		return new Promise((resolve, rejects) => {
			let temp = setInterval(() => {
				if (HelperUtils.fileUpdateFinished) {
					clearInterval(temp);
					resolve();
				}
			}, 200);
		})
	}
	//#endregion 等待文件更新完成

}
