import { Assembler } from "../Core/Assembler";

export interface WordType {
	startColumn: number;
	text: string;
	type: "path" | "var" | "value" | "none";
	value?: number
}

export class LSPUtils {

	static assembler: Assembler;

	//#region 获取光标所在字符
	/**
	 * 获取光标所在字符
	 * @param text 一行文本
	 * @param currect 当前光标未知
	 * @returns 
	 */
	static GetWord(text: string, currect: number, start = 0): WordType {

		currect -= start;
		if (currect > text.length) {
			return { startColumn: currect, text: "", type: "none" };
		}

		// 获取文件
		let preMatch = /(^|\s+)\.INC(LUDE|BIN)\s+"[^\"]"/ig.exec(text);
		if (preMatch) {
			let index = preMatch[0].indexOf("\"");
			return {
				startColumn: preMatch.index + index,
				text: preMatch[0].substring(index + 1, preMatch[0].length - 1),
				type: "path"
			};
		}

		let regex = new RegExp(LSPUtils.assembler.platform.uppperCaseRegexString, "ig");
		let leftMatch = regex.exec(text.substring(0, currect));

		regex = new RegExp(LSPUtils.assembler.platform.uppperCaseRegexString, "ig");
		let rightMatch = regex.exec(text);

		let temp: RegExpExecArray | null;
		if (rightMatch && currect <= rightMatch.index && (temp = /^\s*(\++|\-+)/.exec(text.substring(0, rightMatch.index)))) {
			// 临时变量
			return { startColumn: temp.index, text: temp[0], type: "var" };
		} else if (leftMatch && (temp = /^\s*(\++|\-+)/.exec(text.substring(leftMatch.index + leftMatch[0].length))) != null) {
			// 临时变量
			return { startColumn: leftMatch.index + leftMatch[0].length, text: temp[0], type: "var" };
		} else {
			let left = LSPUtils.StringReverse(text.substring(0, currect));
			let right = text.substring(currect);

			const regexStr = "\\s|\\<|\\>|\\+|\\-|\\*|\\/|\\,|\\(|\\)|\\=|\\#|&|\\||\\^|$";

			let m1 = <RegExpExecArray>new RegExp(regexStr, "g").exec(left);
			let m2 = <RegExpExecArray>new RegExp(regexStr, "g").exec(right);

			let leftIndex = left.length - m1.index;
			left = LSPUtils.StringReverse(left.substring(0, m1.index));
			right = right.substring(0, m2.index);

			let resultText = left + right;
			let number = LSPUtils.assembler.expressionUtils.GetNumber(resultText);
			if (number.success)
				return { startColumn: leftIndex, text: resultText, type: "value", value: number.value };

			return { startColumn: leftIndex, text: resultText, type: "var" };
		}
	}
	//#endregion 获取光标所在字符

	//#region 翻转字符串
	/**
	 * 翻转字符串
	 * @param text 要翻转的字符串
	 * @returns 翻转结果
	 */
	static StringReverse(text: string) {
		return text.split("").reverse().join("")
	}
	//#endregion 翻转字符串

}