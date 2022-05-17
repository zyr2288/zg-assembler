import { BaseLine } from "../Base/BaseLine";
import { Macro } from "../Base/Macro";
import { OneWord } from "./OneWord";

export interface CompileOption {
	allBaseLine: BaseLine[];
	baseLineIndex: number;
	currectLine: BaseLine;
	macro?: Macro;
	exps?: OneWord[];
	includeCommandLines?: { match: string, index: number }[];
}

export interface BaseOption {
	macro?: Macro;
}