export class Token {

}

export enum ParseType {
	None, Space, Word, Operator, Comma, Period, Mark, Quotation1, Quotation2, Brackets1, Brackets2, Brackets3, LineEnd
}

export interface IToken {
	text: string;
	start: number;
}

export interface IParseToken {
	type: ParseType;
	level: number;
	token: IToken;
}