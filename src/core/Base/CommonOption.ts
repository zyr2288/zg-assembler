import { IBaseLine } from "../BaseLine/BaseLine";
import { Macro } from "./Macro";

export interface CommonOption {
	allLine: IBaseLine[];
	lineIndex: number;
	macro?: Macro;
	includeCommandLines?: { match: string, index: number }[];
	tag?: any;
}