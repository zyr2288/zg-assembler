import { Utils } from "../Utils/Utils";

export enum TokenType { None, Label, Variable, Defined, Macro, Keyword }

export class Token {

	//#region 创建一个Token，默认起始位置是0
	/**创建一个Token，默认起始位置是0 */
	static CreateToken(text: string, fileHash: number, lineNumber: number, startColumn: number = 0) {
		let word = new Token();

		word.text = text;
		word.fileHash = fileHash;
		word.lineNumber = lineNumber;
		word.startColumn = startColumn;

		word.Trim();

		return word;
	}
	//#endregion 创建一个Token，默认起始位置是0

	/**类型 */
	type: TokenType = TokenType.None;
	/**文本 */
	text!: string;
	/**起始位置 */
	startColumn!: number;
	/**行号 */
	lineNumber!: number;
	/**文件Hash */
	fileHash!: number;

	get isNull(): boolean { return this.text.length == 0; }
	get length(): number { return this.text.length; }
	get hashCode(): number { return Utils.GetHashcode(this.fileHash, this.text.length, this.lineNumber, this.startColumn); }

	//#region 复制
	Copy(): Token {
		let token = new Token();

		token.text = this.text;
		token.fileHash = this.fileHash;
		token.lineNumber = this.lineNumber;
		token.startColumn = this.startColumn;
		token.type = this.type;

		return token;
	}
	//#endregion 复制

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

		let word = this.Copy();
		word.text = word.text.substring(index, end);
		word.startColumn = this.startColumn + index;
		word.Trim();

		return word;
	}
	//#endregion 截取

	//#region 去除两端空白
	private Trim() {
		let match = Utils.StringTrim(this.startColumn, this.text);
		this.startColumn = match.index;
		this.text = match.text;
	}
	//#endregion 去除两端空白

	//#region 获取所有正则表达式的匹配值
	GetRegexMatchs(pattern: RegExp) {
		let matches: { text: string, index: number }[] = [];
		let temp: RegExpExecArray | null;
		while (temp = pattern.exec(this.text))
			matches.push({ text: temp[0], index: temp.index });

		return matches;
	}
	//#endregion 获取所有正则表达式的匹配值

}