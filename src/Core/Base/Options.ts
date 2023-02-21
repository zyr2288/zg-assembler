import { MacroLabel } from "../Commands/Macro";
import { ICommonLine } from "../Lines/CommonLine";
import { Token } from "./Token";

export interface SplitOption {
	lineText: string;
	restText: string;
	lineNumber: number;
}

export interface DecodeOption {
	macro?: MacroLabel;
	allLines: ICommonLine[];
	lineIndex: number;
}

export interface CommandDecodeOption extends DecodeOption {
	includeCommandLines?: { match: string, index: number }[];
	expressions: Token[];
}
