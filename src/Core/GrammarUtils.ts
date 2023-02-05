import { Commands } from './Commands';
import { Platform } from './Platform/Platform';
import { IParseToken, ParseType, IToken } from './Token';
import { Utils } from './Utils';

export class GrammarUtils {

	//#region 分解文本
	/**分解文本 */
	static AnalyseText(text: string) {

		let result: IParseToken[] = [];

		let index = 0;

		let tempToken: IParseToken = { type: ParseType.None, level: 0, token: { start: index, text: "" } };

		const SaveToken = (type?: ParseType) => {
			if (tempToken.token.text && tempToken.type != ParseType.Space)
				result.push(tempToken);

			tempToken = { type: type ?? ParseType.None, level: 0, token: { start: index, text: text[index] } };
		}

		for (; index < text.length; ++index) {
			switch (text[index]) {
				case "\r":
					break;
				case " ":
				case "\t":
					if (tempToken.type == ParseType.Space) {
						tempToken.token.text += text[index];
						break;
					}

					SaveToken(ParseType.Space);
					break;
				case "\n":
					SaveToken(ParseType.LineEnd);
					break;
				case "!":
				case "@":
				case "#":
				case "$":
				case "%":
				case "^":
				case "&":
				case "*":
				case "(":
				case ")":
				case "-":
				case "+":
				case "=":
				case "{":
				case "}":
				case "[":
				case "}":
				case "|":
				case "\\":
				case ":":
				case ";":
				case "\"":
				case "'":
				case ",":
				case "?":
				case "/":
					SaveToken(ParseType.Operator);
					break;
				case "<":
					SaveToken(ParseType.Operator);
					let temp1 = GrammarUtils.FindNext(text, index + 1, "<", "=");
					if (temp1) {
						tempToken.token.text += temp1;
						index += temp1.length;
					}
					break;
				case ">":
					SaveToken(ParseType.Operator);
					let temp2 = GrammarUtils.FindNext(text, index + 1, ">", "=");
					if (temp2) {
						tempToken.token.text += temp2;
						index += temp2.length;
					}
					break;
				case "!":
					SaveToken(ParseType.Operator);
					let temp3 = GrammarUtils.FindNext(text, index + 1, "=");
					if (temp3) {
						tempToken.token.text += temp3;
						index += temp3.length;
					}
					break;
				case "=":
					SaveToken(ParseType.Operator);
					let temp4 = GrammarUtils.FindNext(text, index + 1, "=");
					if (temp4) {
						tempToken.token.text += temp4;
						index += temp4.length;
					}
					break;
				default:
					if (tempToken.type != ParseType.None) {
						SaveToken();
						break;
					}

					tempToken.token.text += text[index];
					break;
			}
		}

		SaveToken();
		return result;
	}

	private static MatchText() {

	}
	//#endregion 分解文本

	//#region 匹配表达式
	/**匹配表达式 例子 ([exp]),Y [exp],[exp] */
	static MatchingExpression(input: IToken, exp: string, flag?: string) {



		let regex = new RegExp("\[exp\]");
		let result: IToken[] = [];

		let matches = input.text.match(regex)

		return result;
	}
	//#endregion 匹配表达式

	//#region 找到下一个匹配的字符
	private static FindNext(text: string, index: number, ...matches: string[]) {
		let matchResult = "";
		for (let i = 0; i < matches.length; ++i) {
			for (let j = 0; j < matches[i].length; ++j) {
				if (text.charAt(index + j) != matches[i].charAt(j)) {
					matchResult = "";
					break;
				}

				matchResult += text.charAt(j);
			}
		}

		return matchResult;
	}
	//#endregion 找到下一个匹配的字符

}