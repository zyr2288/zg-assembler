export enum ParseType {
	None = -1, Space, LineEnd, Brackets, Operator
}

export enum TokenType {
	None, Command, Operation
}

export interface IToken {
	start: number;
	text: string;
}

export interface IParseToken {
	type: ParseType;
	level: number;
	token: IToken;
}