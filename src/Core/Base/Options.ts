import { MacroLabel } from "../Commands/Macro";
import { ICommonLine } from "../Lines/CommonLine";

export interface SplitOption {
	lineText: string;
	restText: string;
	lineNumber: number;
}

export interface DecodeOption {
	macro?: MacroLabel;
	allLines: ICommonLine[];
	includeCommandLines?: { match: string, index: number }[];
	lineIndex: number;
}
