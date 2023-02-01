import { IParseToken, ParseType } from './Token';

export class Parser {

	//#region 分解文本
	/**分解文本 */
	static ParseText(text: string) {

		let result: IParseToken[] = [];

		let lastToken: IParseToken | undefined;
		let updateLast = false;

		let tempToken: IParseToken = { type: ParseType.None, level: 0, token: { start: 0, text: "" } };

		for (let i = 0; i < text.length; ++i) {

			switch (text[i]) {
				case " ":
				case "\t":
					tempToken.token.text += text[i];
					if (tempToken.type == ParseType.Space) continue;
					tempToken.token.start = i;
					tempToken.type = ParseType.Space;
					updateLast = true;
					break;
				case "\n":
					tempToken.token.start = i;
					tempToken.token.text = text[i];
					tempToken.type = ParseType.LineEnd;
					updateLast = true;
					break;
				case "\r":
					continue;
				case "+":
				case "-":
				case "*":
				case "/":
				case "&":
				case "|":
				case "!":
				case "^":
				case "<":
				case ">":
					tempToken.type = ParseType.Operator;
					tempToken.token.text = text[i];
					updateLast = true;
					break;
				case "$":
				case "@":
				case "#":
				case "$":
				case "%":
				case "^":
				case ";":
				case ":":
				case "\\":
				case "`":
				case "~":
				case "?":
				case ".":
					tempToken.type = ParseType.Mark;
					tempToken.token.text = text[i];
					updateLast = true;
					break;
				case "'":
					tempToken.type = ParseType.Quotation1;
					tempToken.token.text = text[i];
					updateLast = true;
					break;
				case "\"":
					tempToken.type = ParseType.Quotation2;
					tempToken.token.text = text[i];
					updateLast = true;
					break;
				case "(":
				case ")":
					tempToken.type = ParseType.Brackets1;
					tempToken.token.text = text[i];
					updateLast = true;
					break;
				case "[":
				case "]":
					tempToken.type = ParseType.Brackets2;
					tempToken.token.text = text[i];
					updateLast = true;
					break;
				case "{":
				case "}":
					tempToken.type = ParseType.Brackets3;
					tempToken.token.text = text[i];
					updateLast = true;
					break;
				default:
					tempToken.token.text += text[i];
					continue;
			}

			if (!updateLast) {
				updateLast = false;
				continue;
			}

			if (lastToken)
				result.push(lastToken);

			lastToken = tempToken;
			tempToken = { type: ParseType.None, level: 0, token: { start: i + 1, text: "" } };
		}

		result.push(tempToken);
		return result;
	}
	//#endregion 分解文本

}