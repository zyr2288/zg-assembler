import { Utils } from "../Utils/Utils";

export class OneWord {

	//#region 创建一个词语
	/**
	 * 创建一个词语
	 * @param text 文本
	 * @param fileHash 文件Hash
	 * @param lineNumber 行号，从1开始
	 * @param startColumn 起始位置
	 * @returns 
	 */
	static CreateWord(text: string, fileHash: number, lineNumber: number, startColumn: number): OneWord {
		let word = new OneWord();
		word.text = text;
		word.fileHash = fileHash;
		word.lineNumber = lineNumber;
		word.startColumn = startColumn;

		word.Trim();

		return word;
	}
	//#endregion 创建一个词语

	text: string = "";
	fileHash: number = 0;
	/**行号，从0开始 */
	lineNumber: number = 0;
	startColumn: number = 0;

	get length(): number { return this.text.length; }
	get isNull(): boolean { return this.text.length == 0; }
	/**文本的Hash，通过 fileHash text lineNumber, startColumn 计算 */
	get hashcode(): number { return Utils.GetHashcode(this.fileHash, this.text, this.lineNumber, this.startColumn); }

	//#region 获取某个Char，\n为结束
	/**获取某个Char，\n为结束 */
	GetChar(index: number) {
		if (index >= this.text.length)
			return "\n";

		return this.text[index];
	}
	//#endregion 获取某个Char，\n为结束

	//#region 用正则表达式分割字符串
	/**
	 * 用正则表达式分割字符串
	 * @param regex 要分割的正则表达式
	 * @param count 分割次数，不填写则最大分割
	 * @returns 返回分割的OneWord[]
	 */
	Split(regex: RegExp, count?: number): OneWord[] {
		let result: OneWord[] = [];
		let match: RegExpExecArray | null;
		let start = 0;
		if (count == undefined) {
			while (match = regex.exec(this.text)) {
				result.push(this.Substring(start, match.index - start));
				start = match.index + match[0].length;
			}

			let temp = this.Substring(start);
			if (!temp.isNull)
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

	//#region 查找字符
	/**
	 * 查找字符
	 * @param pattern 要寻找的字符
	 * @param searchIndex 查找起始点
	 * @returns 查找结果，-1未未找到
	 */
	IndexOf(pattern: string | RegExp, searchIndex = 0) {
		let result = { match: "", index: -1 };
		if (typeof (pattern) == "string") {
			result.index = this.text.indexOf(pattern, searchIndex);
			if (result.index >= 0) {
				result.match = pattern;
				return result;
			}
		} else {
			let temp = this.text.substring(searchIndex);
			let match: RegExpExecArray | null = null;
			if (match = pattern.exec(temp)) {
				result = { match: match[0], index: searchIndex + match.index };
				return result;
			}
		}
	}
	//#endregion 查找字符

	//#region 获取所有正则表达式的匹配值
	GetRegexMatchs(pattern: RegExp) {
		let matches: { text: string, index: number }[] = [];
		let temp: RegExpExecArray | null;
		while (temp = pattern.exec(this.text))
			matches.push({ text: temp[0], index: temp.index });

		return matches;
	}
	//#endregion 获取所有正则表达式的匹配值

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

	//#region 复制
	Copy(): OneWord {
		let word = new OneWord();

		word.text = this.text;
		word.fileHash = this.fileHash;
		word.lineNumber = this.lineNumber;
		word.startColumn = this.startColumn;

		return word;
	}
	//#endregion 复制

	//#region 去除两端空白
	private Trim() {
		let match = Utils.StringTrim(this.startColumn, this.text);
		this.startColumn = match.index;
		this.text = match.text;
	}
	//#endregion 去除两端空白

}