import { DecodeOption } from "../Base/Options";
import { ICommonLine, LineType } from "./CommonLine";

/**委托接口 */
export interface IDelegateLine extends ICommonLine {
	args: any;
	FirstProcess?: (option: DecodeOption) => void;
	SecondProcess?: (option: DecodeOption) => void;
	ThirdProcess?: (option: DecodeOption) => void;
}