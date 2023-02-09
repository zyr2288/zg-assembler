import { Macro } from "./Macro";
import { ICommonLine } from "../Lines/CommonLine";

export interface DecodeOption {
	macro?: Macro;
	allLines: ICommonLine[];
	lineIndex: number;
	fileHash: number;
}