import { SplitLine } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { IAddressingMode } from "../Platform/AsmCommon";
import { Platform } from "../Platform/Platform";
import { HightlightToken, HightlightType, ICommonLine, LineType } from "./CommonLine";

export interface IInstructionLine extends ICommonLine {
	splitLine?: SplitLine;
	label?: ILabel;
	instruction: Token;
	exprParts: ExpressionPart[][];
	addressingMode: IAddressingMode;
	result?: number[];
}

export class Instruction {

	//#region 第一次分析
	/**
	 * 第一次编译，分析操作指令的地址模式，并分割表达式内容
	 * @param option 解析选项
	 */
	static FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as IInstructionLine;
		if (!line.splitLine!.label.isEmpty) {
			let label = LabelUtils.CreateLabel(line.splitLine!.label, option);
			if (label) label.labelType = LabelType.Label;
			line.label = label;
		}

		line.exprParts = [];

		let temp;
		if (temp = Platform.platform.MatchAddressingMode(line.instruction, line.splitLine!.expression)) {
			line.addressingMode = temp.addressingMode;
			for (let i = 0; i < temp.exprs.length; ++i) {
				let temp2 = ExpressionUtils.SplitAndSort(temp.exprs[i]) ?? [];
				line.exprParts[i] = temp2;
			}
		}

		// 删除分行设置
		delete (line.splitLine);
	}
	//#endregion 第一次分析

	//#region 第三次分析，并检查表达式是否有误
	static ThirdAnalyse(option: DecodeOption): void {
		let line = option.allLines[option.lineIndex] as IInstructionLine;
		for (let i = 0; i < line.exprParts.length; ++i)
			ExpressionUtils.CheckLabelsAndShowError(line.exprParts[i]);

		line.GetTokens = Instruction.GetToken.bind(line);
	}
	//#endregion 第三次分析，并检查表达式是否有误

	//#region 获取高亮Token
	static GetToken(this: IInstructionLine) {
		let result: HightlightToken[] = [];

		if (this.label)
			result.push({ token: this.label.token, type: HightlightType.Label });

		result.push({ token: this.instruction, type: HightlightType.Keyword });

		for (let i = 0; i < this.exprParts.length; ++i) {
			for (let j = 0; j < this.exprParts[i].length; ++j) {
				const part = this.exprParts[i][j];
				result.push({ token: part.token, type: part.highlightingType });
			}
		}

		return result;
	}
	//#endregion 获取高亮Token

	static SetResult(line: IInstructionLine, value: number, index: number, length: number) {
		line.result ??= [];

	}
}