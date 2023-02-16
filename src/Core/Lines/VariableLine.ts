import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { ICommonLine } from "./CommonLine";

export interface IVariableLine extends ICommonLine {
	labelToken: Token;
	expression: Token;
}

export class VariableUtils {
	static FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as IVariableLine;
	}

	static ThirdAnalyse(option: DecodeOption) {

	}
}