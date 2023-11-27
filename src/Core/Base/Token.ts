import { Utils } from "./Utils";

export enum TokenType {
	Defined, Label, Variable
}

export class Token {

	//#region 建立一个Token
	/**
	 * 建立一个Token
	 * @param fileHash 文件名hash
	 * @param line 行号，0开始
	 * @param start 起始位置
	 * @param text 文本
	 * @returns Token
	 */
	static CreateToken(fileHash: number, line: number, start: number, text: string) {
		let token = new Token();

		token.fileHash = fileHash;
		token.line = line;
		token.start = start;
		token.text = text;

		token.Trim();

		return token;
	}

	//#endregion 建立一个Token

	//#region 建立一个空白Token
	/**建立一个空白Token */
	static EmptyToken() { return new Token(); }
	//#endregion 建立一个空白Token

	private constructor() {

	}

	/**文件路径Hash */
	fileHash: number = 0;
	/**所在文件行号，0开始 */
	line: number = 0;
	/**所在行的起始位置 */
	start: number = 0;
	/**文本 */
	text: string = "";

	get length() { return this.text.length; }
	get isEmpty() { return this.text.length === 0; }

	//#region 拷贝
	Copy() {
		let token = new Token();
		token.fileHash = this.fileHash;
		token.line = this.line;
		token.start = this.start;
		token.text = this.text;
		return token;
	}
	//#endregion 拷贝

	//#region 用正则表达式分割字符串
	/**
	 * 用正则表达式分割字符串
	 * @param regex 要分割的正则表达式
	 * @param count 分割次数，不填写则最大分割
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
		var end: number | undefined = undefined;
		if (length == undefined)
			end = undefined;
		else
			end = index + length;

		let word = this.Copy();
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