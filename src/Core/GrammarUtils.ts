import { Commands } from './Commands';
import { Platform } from './Platform/Platform';
import { IParseToken, ParseType, IToken, IPartToken, PartType } from './TToken';

export class GrammarUtils {

	//#region 分解文本
	/**分解文本 */
	static ParseTexts(text: string) {

		let result: IParseToken[] = [];

		const regexs = [
			/\s+/, /\;.*?((\r?\n)|$)/, /\r?\n/,
			/[\(\)\[\]\{\}]/,
			/(\<\<)|(\<\=)|(\>\>)|(\>\=)|(\!\=)|\=|(\&\&)|(\|\|)|\<|\>|\+|\-|\*|\/|\&|\||\!/
		];
		const regexType = [ParseType.Space, ParseType.Common, ParseType.LineEnd, ParseType.Brackets, ParseType.Operator];

		let match, tempMatch: RegExpExecArray | null = null;
		let parseToken: IParseToken = { type: ParseType.None, token: { start: 0, text: "" } };
		let index = 0;
		let matchIndex = 0;

		while (true) {
			for (let i = 0; i < regexs.length && text; ++i) {
				const regex = new RegExp(regexs[i]);
				tempMatch = regex.exec(text);
				if (!tempMatch || (match && tempMatch.index > match.index))
					continue;

				match = tempMatch;
				matchIndex = i;
			}

			if (match) {
				let temp = text.substring(0, match.index);
				if (temp != "") {
					let preToken = { type: ParseType.Word, token: { start: index, text: temp } };
					result.push(preToken);
				}

				if (regexType[matchIndex] != ParseType.Space) {
					parseToken.token.start = index + match.index;
					parseToken.token.text = match[0].trimEnd();
					parseToken.type = regexType[matchIndex];
					result.push(parseToken);
					parseToken = { type: ParseType.None, token: { start: 0, text: "" } };
				}

				let temp2 = match.index + match[0].length;
				index += temp2;
				text = text.substring(temp2);
				match = null;
				continue;
			}
			break;
		}

		return result;
	}
	//#endregion 分解文本

	static GetWordType(parseTokens: IParseToken[]) {

		let result: IPartToken[] = [];

		// et instructions = Platform.platform.instruction.GetInstructions();
		let tempPart: IPartToken = { level: 0, type: PartType.None, token: { start: 0, text: "" } };

		const SaveToken = (type: PartType) => {
			tempPart.type = type;
			result.push(tempPart);
			tempPart = { level: 0, type: PartType.None, token: { start: 0, text: "" } };
		}

		let index = 0;
		let partType = PartType.None;
		let lineStart = true;

		for (; index < parseTokens.length; ++index) {
			const parseToken = parseTokens[index];
			tempPart.token = parseToken.token;
			switch (parseToken.type) {
				case ParseType.Word:
					if (Commands.AllCommand.includes(parseToken.token.text.toUpperCase())) {
						SaveToken(PartType.Command);
						
					// } else if (instructions.includes(parseToken.token.text.toUpperCase())) {
					// 	SaveToken(PartType.Instruction);
					} else {
						SaveToken(PartType.Label);
					}
					break;
				case ParseType.LineEnd:
					lineStart = true;
					break;
			}
		}

		return result;
	}

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