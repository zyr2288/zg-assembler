import { Token } from "../Base/Token";

export enum LineType {
	Unknow, Instruction, Command, Variable, Macro, OnlyLabel, Delegate
}

export enum HightlightType {
	None, Label, Keyword, Macro, Defined
}

/**通用行接口 */
export interface ICommonLine {
	orgText: Token;
	type: LineType;
	finished: boolean;
	comment?: string;
	GetTokens?: () => HightlightToken[];
}

export interface HightlightToken {
	type: HightlightType;
	token: Token;
}

export interface IUnknowLine extends ICommonLine {
}

export interface HightlightRange {
	type: "DataGroup" | "Macro";
	start: number;
	end: number;
}