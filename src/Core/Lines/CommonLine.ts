import { ILabel } from "../Base/Label";
import { Token } from "../Base/Token";

export interface SplitLine {
	label: Token;
	comOrIntrs: Token;
	expression: Token;
}

export enum LineType {
	Unknow, Instruction, Command, Variable, Macro, OnlyLabel, Delegate
}

export enum LineCompileType {
	None, Error, Finished, Ignore
}

export enum HighlightType {
	None, Label, Keyword, Macro, Defined, Variable
}

/**通用行接口 */
export interface ICommonLine {
	orgText: Token;
	type: LineType;
	compileType: LineCompileType;
	comment?: string;
	GetTokens?: () => HighlightToken[];
}

export interface HighlightToken {
	type: HighlightType;
	token: Token;
}

export interface IOnlyLabel extends ICommonLine {
	label: ILabel;
}

export interface HightlightRange {
	type: "DataGroup" | "Macro";
	key: string;
	start: number;
	end: number;
}