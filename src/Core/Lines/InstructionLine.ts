import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { IAddressingMode } from "../Platform/AsmCommon";
import { Platform } from "../Platform/Platform";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, SplitLine } from "./CommonLine";

export interface IInstructionLine extends ICommonLine {
	orgAddress: number;
	baseAddress: number
	splitLine?: SplitLine;
	label?: ILabel;
	instruction: Token;
	exprParts: ExpressionPart[][];
	addressingMode: IAddressingMode;
	result: number[];
}

export class InstructionLine {

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
		line.instruction = line.splitLine!.comOrIntrs;
		line.GetTokens = InstructionLine.GetToken.bind(line);

		let temp;
		if (temp = Platform.platform.MatchAddressingMode(line.instruction, line.splitLine!.expression)) {
			line.addressingMode = temp.addressingMode;
			for (let i = 0; i < temp.exprs.length; ++i) {
				let temp2 = ExpressionUtils.SplitAndSort(temp.exprs[i]);
				if (temp2) {
					line.exprParts[i] = temp2;
				} else {
					line.compileType = LineCompileType.Error;
					line.exprParts[i] = [];
				}
			}
		} else {
			line.compileType = LineCompileType.Error;
		}

		// 删除分行设置
		delete (line.splitLine);
	}
	//#endregion 第一次分析

	//#region 第三次分析，并检查表达式是否有误
	static ThirdAnalyse(option: DecodeOption): void {
		let line = option.allLines[option.lineIndex] as IInstructionLine;
		for (let i = 0; i < line.exprParts.length; ++i)
			ExpressionUtils.CheckLabelsAndShowError(line.exprParts[i], option);
	}
	//#endregion 第三次分析，并检查表达式是否有误

	//#region 编译汇编指令
	/**编译汇编指令 */
	static CompileInstruction(option: DecodeOption): void {
		const line = option.allLines[option.lineIndex] as IInstructionLine;
		if (!Compiler.SetAddress(line))
			return;

		if (line.addressingMode.spProcess) {
			line.addressingMode.spProcess(option);
			Compiler.AddAddress(line);
			return;
		}

		line.compileType = LineCompileType.Finished;
		if (!line.exprParts[0]) {
			Compiler.SetResult(line, line.addressingMode.opCode[0]!, 0, line.addressingMode.opCodeLength[0]!);
			Compiler.AddAddress(line);
			return;
		}

		const tryValue = Compiler.isLastCompile ? ExpressionResult.GetResultAndShowError : ExpressionResult.TryToGetResult;
		let temp = ExpressionUtils.GetExpressionValue(line.exprParts[0], tryValue, option);
		if (!temp.success) {
			let index = line.addressingMode.opCode.length - 1;
			line.result.length = line.addressingMode.opCodeLength[index]! + index;
			line.compileType = LineCompileType.None;
		} else {
			let orgLength: number, length: number;
			orgLength = length = Utils.GetNumberByteLength(temp.value);
			if (line.result.length !== 0) {
				length = line.result.length - 1;
			} else {
				if (!line.addressingMode.opCode[length]) {
					for (let i = 0; i < line.addressingMode.opCode.length; ++i) {
						if (!line.addressingMode.opCode[i])
							continue;

						length = i;
						break;
					}
				}
			}

			let opCodeLength = line.addressingMode.opCodeLength[length]!;
			Compiler.SetResult(line, line.addressingMode.opCode[length]!, 0, opCodeLength);
			let tempValue = Compiler.SetResult(line, temp.value, opCodeLength, length);

			if (orgLength > length || temp.value < 0) {
				let errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.value, tempValue);
				let token = ExpressionUtils.CombineExpressionPart(line.exprParts[0]);
				MyDiagnostic.PushWarning(token, errorMsg);
			}
		}

		Compiler.AddAddress(line);
	}
	//#endregion 编译汇编指令

	//#region 获取高亮Token
	static GetToken(this: IInstructionLine) {
		let result: HighlightToken[] = [];

		if (this.label)
			result.push({ token: this.label.token, type: HighlightType.Label });

		result.push({ token: this.instruction, type: HighlightType.Keyword });

		for (let i = 0; i < this.exprParts.length; ++i) {
			for (let j = 0; j < this.exprParts[i].length; ++j) {
				const part = this.exprParts[i][j];
				result.push({ token: part.token, type: part.highlightingType });
			}
		}

		return result;
	}
	//#endregion 获取高亮Token

}