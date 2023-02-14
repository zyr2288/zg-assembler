import { Macro } from "./Macro";
import { ICommonLine } from "../Lines/CommonLine";

export interface SplitOption {
	lineText: string;
	restText: string;
	lineNumber: number;
}

export interface DecodeOption {
	macro?: Macro;
	allLines: ICommonLine[];
	lineIndex: number;
}
