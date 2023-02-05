export enum ParseType {
	None = -1, Space, LineEnd, Brackets, Operation, Common
}

export enum PartType {
	None = -1, Label, Expression, Instruction, Command, Common,
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

export interface IPartToken {
	type: PartType;
	token: IToken;
}