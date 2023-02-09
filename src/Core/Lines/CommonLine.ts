import { DecodeOption } from "../Base/Options";

export enum LineType {
	Unknow, Instruction, Command, Variable, Macro, Delegate
}

/**通用行接口 */
export interface ICommonLine {
	type: LineType;
	comment?: string;
}