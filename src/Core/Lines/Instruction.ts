import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { IAddressingMode } from "../Platform/AsmCommon";
import { Platform } from "../Platform/Platform";
import { ICommonLine, LineType } from "./CommonLine";

export interface IInstructionLine extends ICommonLine {
	labelToken?: Token;
	instruction: Token;
	expression: Token;
	exprParts: ExpressionPart[][];
	addressingMode: IAddressingMode;
	result?: number[];
}

export class Instruction {

	static FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as IInstructionLine;
		if (line.labelToken) {
			let label = LabelUtils.CreateLabel(line.labelToken, option);
			if (label) label.labelType = LabelType.Label;
			delete (line.labelToken);
		}

		line.exprParts = [];

		let temp;
		if (temp = Platform.platform.MatchAddressingMode(line.instruction, line.expression as Token)) {
			line.addressingMode = temp.addressingMode;
			for (let i = 0; i < temp.exprs.length; ++i) {
				let temp2 = ExpressionUtils.SplitAndSort(temp.exprs[i]) ?? [];
				line.exprParts[i] = temp2;
			}
		}

	}

	static ThirdAnalyse(option: DecodeOption): void {
		let line = option.allLines[option.lineIndex] as IInstructionLine;
		for (let i = 0; i < line.exprParts.length; ++i)
			ExpressionUtils.CheckLabelsAndShowError(line.exprParts[i]);

	}

	static SetResult(line: IInstructionLine, value: number, index: number, length: number) {
		line.result ??= [];

	}
}