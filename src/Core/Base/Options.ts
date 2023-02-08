import { Macro } from "./Macro";
import { IBaseLine } from "./LineUtils";

export interface DecodeOption {
	macro?: Macro;
	allLines: IBaseLine[];
	lineIndex: number;
}