import { DecodeOption } from "../Base/Options";

export enum LineType {
	Unknow, Instruction, Command, Variable, Macro, Delegate
}

/**通用行接口 */
export interface ICommonLine {
	lineStart: number;
	lineEnd: number;
	type: LineType;
	finished: boolean;
	comment?: string;
}