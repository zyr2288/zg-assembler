import { Token, TokenType } from "../Base/Token";
import { BaseLineType, IBaseLine } from "./BaseLine";

export class CommandLine implements IBaseLine {

	static CreateLine(parts: { pre: Token, match: Token, after: Token }, comment?: string) {
		let comLine = new CommandLine();

		comLine.label = parts.pre;
		if (!parts.pre.isNull) {
			comLine.label = parts.pre;
			comLine.label.type = TokenType.Label;
		}

		comLine.keyword = parts.match;
		comLine.keyword.text = comLine.keyword.text.toUpperCase();
		comLine.expression = parts.after;

		comLine.comment = comment;

		return comLine;
	}

	lineType = BaseLineType.Command;
	orgText!: Token;
	errorLine = false;

	label?: Token;
	keyword!: Token;
	/**存放表达式 */
	expression!: Token;
	tokens: Token[] = [];
	comment?: string;
	/**存放任何信息 */
	tag?: any;

	orgAddress = -1;
	baseAddress = -1;
	result: number[] = [];
	isFinished = false;

	GetToken(): Token[] {
		return this.tokens;
	}
}