import { Macro } from "./Macro";
import { ICommonLine } from "../Lines/CommonLine";

export interface SplitOption {
	fileHash: number;
	text: string;
	lineStart: number;
	lineEnd: number;
	line: ICommonLine;
}

export interface DecodeOption {
	macro?: Macro;
	allLines: ICommonLine[];
	lineIndex: number;
	fileHash: number;
}
