import { Utils } from "../Utils";

export class Token {

	line: number = 0;
	start: number = 0;
	text: string = "";

	get length() { return this.text.length; }

	//#region 用正则表达式分割字符串
	/**
	 * 用正则表达式分割字符串
	 * @param regex 要分割的正则表达式
	 * @param count 分割次数，不填写则最大分割
	 * @returns 返回分割的OneWord[]
	 */
	Split(regex: RegExp, count?: number): Token[] {
		let result: Token[] = [];
		let match: RegExpExecArray | null;
		let start = 0;
		if (count == undefined) {
			while (match = regex.exec(this.text)) {
				result.push(this.Substring(start, match.index - start));
				start = match.index + match[0].length;
			}

			let temp = this.Substring(start);
			result.push(temp);
		} else {
			result.length = count + 1;
			let index = 0;
			while ((match = regex.exec(this.text)) != null && index < count) {
				result[index] = this.Substring(start, match.index - start);
				start = match.index + match[0].length;
				index++;
			}

			while (index <= count) {
				result[index] = this.Substring(start);
				start += result[index].length;
				index++;
			}
		}
		return result;
	}
	//#endregion 用正则表达式分割字符串

	//#region 截取
	Substring(index: number, length?: number) {
		var end: number | undefined = undefined;
		if (length == undefined)
			end = undefined;
		else
			end = index + length;

		let word = Utils.DeepClone<Token>(this);
		word.text = word.text.substring(index, end);
		word.start = this.start + index;
		word.Trim();

		return word;
	}
	//#endregion 截取

	//#region 去除两端空白
	private Trim() {
		let match = Utils.StringTrim(this.start, this.text);
		this.start = match.index;
		this.text = match.text;
	}
	//#endregion 去除两端空白

}