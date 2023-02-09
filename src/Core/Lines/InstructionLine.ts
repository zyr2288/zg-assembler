import { LabelType, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { ICommonLine, LineType } from "./CommonLine";

export interface IInstructionLine extends ICommonLine {
	labelToken?: Token;
	instruction: Token;
	expression: Token;
	result?: number[];
}

export class InstructinLineUtils {
	static FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as IInstructionLine;
		if (line.labelToken) {
			let label = LabelUtils.CreateLabel(line.labelToken, option);
			if (label) label.labelType = LabelType.Label;
			delete(line.labelToken);
		}
	}
}