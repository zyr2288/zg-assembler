import { Commands } from './Commands';
import { Platform } from './Platform/Platform';
import { IParseToken, ParseType, IToken, IPartToken, PartType } from './Token';

export class GrammarUtils {

	//#region 分解文本
	/**分解文本 */
	static ParseTexts(text: string) {

		let result: IParseToken[] = [];

		let index = 0;
		let tempToken: IParseToken = { type: ParseType.None, level: 0, token: { start: index, text: "" } };
		let isCommon = false;

		const SaveToken = (type?: ParseType) => {
			if (tempToken.token.text && tempToken.type != ParseType.Space)
				result.push(tempToken);

			tempToken = { type: type ?? ParseType.None, level: 0, token: { start: index, text: text[index] } };
		}

		const SaveNext = (...matches: string[]) => {
			SaveToken(ParseType.Operation);
			let temp1 = GrammarUtils.FindNext(text, index + 1, ...matches);
			if (temp1) {
				tempToken.token.text += temp1;
				index += temp1.length;
			}
		}

		for (; index < text.length; ++index) {
			if (isCommon) {
				if (text[index] != "\n") {
					if (text[index] == "\r")
						continue;

					tempToken.token.text += text[index];
					continue;
				}
				isCommon = false;
			}

			switch (text[index]) {
				case "\r":
					SaveToken();
					tempToken.token.text = "";
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
					if (tempToken.type == ParseType.LineEnd) {
						tempToken.token.text += text[index];
						break;
					}

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
				case "-":
				case "+":
				case "=":
				case "|":
				case "\\":
				case ":":
				case "\"":
				case "'":
				case ",":
				case "?":
				case "/":
					SaveToken(ParseType.Operation);
					break;
				case ";":
					isCommon = true;
					SaveToken(ParseType.Common);
					break;
				case "(":
				case ")":
				case "{":
				case "}":
				case "[":
				case "}":
					break;
				case "<":
					SaveNext("<", "=");
					break;
				case ">":
					SaveNext(">", "=");
					break;
				case "!":
				case "=":
					SaveNext("=");
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

	static AnalyseParsers(tokens: IParseToken[]) {
		let lineStart = true;

		let index = 0;
		let matchIndex = -1;
		let result: IPartToken[] = [];

		let allInstruction = Platform.platform.instruction.GetInstructions();

		let tempPart: IPartToken = { type: PartType.None, token: { start: 0, text: "" } };
		let parseToken: IParseToken;
		let partToken: IPartToken;

		const SaveToken = (type?: PartType) => {
			result.push(tempPart);
			tempPart = { type: type ?? PartType.None, token: parseToken.token };
		}

		for (; index < tokens.length; ++index) {
			parseToken = tokens[index];

			switch (parseToken.type) {
				case ParseType.LineEnd:
					lineStart = true;
					continue;
				case ParseType.Common:
					SaveToken(PartType.Common);
					lineStart = true;
					continue;
			}

			if (lineStart) {
				lineStart = false;

				matchIndex = allInstruction.indexOf(parseToken.token.text.toUpperCase());
				if (matchIndex >= 0) {
					partToken = { type: PartType.Instruction, token: parseToken.token };
				}

				matchIndex = Commands.AllCommand.indexOf(parseToken.token.text.toUpperCase())
				if (matchIndex >= 0) {

				}

			}
		}
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

				matchResult += text.charAt(index + j);
			}

			if (matchResult != "")
				break;
		}

		return matchResult;
	}
	//#endregion 找到下一个匹配的字符

}