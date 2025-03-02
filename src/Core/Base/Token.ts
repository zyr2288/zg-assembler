/**一个词元 */
export class Token {

	/**文本一行起始位置 */
	start: number;
	/**行号，从0开始 */
	line: number;
	/**文本内容 */
	text: string;

	constructor(text: string, option?: { start?: number, line?: number }) {
		this.text = text;
		this.start = option?.start ?? 0;
		this.line = option?.line ?? 0;
	}

	/**字符串长度 */
	get length() { return this.text.length; }

	/**是否为空白字符串 */
	get isEmpty() { return this.text.trim() === ""; }

	//#region 拷贝
	Copy() {
		const token = new Token(this.text, { start: this.start, line: this.line });
		return token;
	}
	//#endregion 拷贝

	//#region 用正则表达式分割字符串
	/**
	 * 用正则表达式分割字符串
	 * @param regex 要分割的正则表达式
	 * @param option.saveToken 是否保存分隔符
	 * @param option.count 分割次数，不填写则最大分割
	 * @returns 返回分割的OneWord[]
	 */
	Split(regex: RegExp, option?: { saveToken?: boolean, count?: number }): Token[] {
		let result: Token[] = [];
		let match: RegExpExecArray | null;
		let start = 0;
		if (option?.count == undefined) {
			while (match = regex.exec(this.text)) {
				result.push(this.Substring(start, match.index - start));
				start = match.index + match[0].length;

				if (option?.saveToken)
					result.push(this.Substring(match.index, match[0].length));
			}

			let temp = this.Substring(start);
			result.push(temp);
		} else {
			result.length = option.count + 1;
			let index = 0;
			while ((match = regex.exec(this.text)) != null && index < option.count) {
				result[index] = this.Substring(start, match.index - start);
				start = match.index + match[0].length;
				index++;

				if (option?.saveToken)
					result.push(this.Substring(match.index, match[0].length));
			}

			while (index <= option.count) {
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
		let end: number | undefined = undefined;
		if (length == undefined)
			end = undefined;
		else
			end = index + length;

		const word = this.Copy();
		word.text = word.text.substring(index, end);
		word.start = this.start + index;

		return word;
	}
	//#endregion 截取

	//#region 去除两端空白
	Trim() {
		const match = /^\s+/.exec(this.text);
		const copy = this.Copy();
		if (match)
			copy.start += match[0].length;

		copy.text = this.text.trim();
		return copy;
	}
	//#endregion 去除两端空白

}