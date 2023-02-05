import { Commands } from './Commands';
import { Platform } from './Platform/Platform';
import { IParseToken, ParseType, IToken } from './Token';
import { Utils } from './Utils';

export class GrammarUtils {

	//#region 分解文本
	/**分解文本 */
	static AnalyseText(text: string) {

		let result: IParseToken[] = [];

		let matchStrings = [
			"\\s+", "[\\(\\)\\[\\]\\{\\}]", "[(\\<\\<)\\<\\>\\+\\-\\*\\/\\&\\|\\!]", "\\r?\\n+"
		];

		let tempToken: IParseToken = { type: ParseType.None, level: 0, token: { start: 0, text: "" } };

		let index = 0;
		let matchToken = { start: 0, matchIndex: -1, text: "" };

		const SaveToken = () => {
			if (matchToken.matchIndex == ParseType.Space)
				return;

			tempToken.token.start = matchToken.start;
			tempToken.token.text = matchToken.text;
			tempToken.type = matchToken.matchIndex;
			result.push(tempToken);
			tempToken = { type: ParseType.None, level: 0, token: { start: 0, text: "" } };
		}

		const MatchText = () => {
			text = text.substring(index);
			for (let i = 0; i < matchStrings.length; ++i) {
				let regex = new RegExp(matchStrings[i]);
				let match = regex.exec(text);
				if (match == null)
					continue;

				SaveToken();
				break;
			}
			return result;
		}

		while (true) {
			GrammarUtils.MatchText();
			index = matchToken.matchIndex + matchToken.text.length;
			if (matchToken.matchIndex < 0)
				break;

			SaveToken();
		}

		return result;
	}

	private static MatchText() {

	}
	//#endregion 分解文本

	//#region 文本排序
	static SortTokens(tokens: IParseToken[]) {

		let index = 0;
		let lineStart = true;

		for (; index < tokens.length; ++index) {
			const parserToken = tokens[index];
			const upper = parserToken.token.text.toUpperCase();
			if (Commands.AllCommand.includes(upper)) {
			}
		}


	}
	//#endregion 文本排序

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
			}
		}

		return matchResult;
	}
	//#endregion 找到下一个匹配的字符

}