import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";

export enum LineType {
	Unknow, Instruction, Command, Variable, Macro, Delegate
}

/**通用行接口 */
export interface ICommonLine {
	orgText: Token;
	type: LineType;
	finished: boolean;
	comment?: string;
}

export interface HightlightRange {
	type: "DataGroup" | "Macro";
	start: number;
	end: number;
}