export enum ParseType {
	None = -1, Word, Space, LineEnd, Brackets, Operator, Common
}

export enum PartType {
	None = -1, Label, Number, Instruction, Command, Common,
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
	token: IToken;
}

export interface IPartToken {
	level: 0;
	type: PartType;
	token: IToken;
}