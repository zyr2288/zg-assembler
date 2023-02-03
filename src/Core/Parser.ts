import { Commands } from './Commands';
import { Platform } from './Platform/Platform';
import { IParseToken, ParseType } from './Token';
import { Utils } from './Utils';

export class GrammarUtils {

	//#region 分解文本
	/**分解文本 */
	static AnalyseText(text: string) {

		let result: IParseToken[] = [];

		let matchStrings = [
			"\\s+", "[\\(\\)\\[\\]\\{\\}]", "[(\\<\\<)\\<\\>\\+\\-\\*\\/\\&\\|\\!]", "\r?\n+"
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

				result.text = match[0];
				result.start = match.index + index;
				result.matchIndex = i;
				break;
			}
			return result;
		}

		while (true) {
			matchToken = GrammarUtils.MatchText(text, index, matchStrings);
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
	static MatchingExpression(exp: string) {

	}
	//#endregion 匹配表达式

}