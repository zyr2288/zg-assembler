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
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

// export interface IInstructionLine extends ICommonLine {
// 	orgAddress: number;
// 	baseAddress: number
// 	splitLine?: SplitLine;
// 	label?: ILabel;
// 	instruction: Token;
// 	exprParts: ExpressionPart[][];
// 	addressingMode: IAddressingMode;
// 	result: number[];
// }

export class InstructionLine implements ICommonLine {

	type = LineType.Instruction;
	compileType = LineCompileType.None;
	orgText!: Token;

	orgAddress = -1;
	baseAddress = 0;

	labelToken?: Token;

	instruction!: Token;
	expression?: Token;
	exprParts: ExpressionPart[][] = [];
	addressingMode!: IAddressingMode;
	result: number[] = [];

	comment?: string;

	Initialize(option: { instruction: Token, expression: Token, labelToken?: Token }) {
		this.instruction = option.instruction;
		this.instruction.text = this.instruction.text.toUpperCase();
		this.expression = option.expression;
		this.labelToken = option.labelToken;
	}

	SetResult(value: number, index: number, length: number): number {
		return Compiler.SetResult(this, value, index, length);
	}

	SetAddress() {
		Compiler.SetAddress(this);
	}

	AddAddress() {
		Compiler.AddAddress(this);
	}

	GetTokens() {
		let result: HighlightToken[] = [];
		if (this.labelToken)
			result.push({ type: HighlightType.Label, token: this.labelToken });

		result.push({ type: HighlightType.Keyword, token: this.instruction });
		result.push(...ExpressionUtils.GetHighlightingTokens(this.exprParts));
		return result;
	}
}

export class InstructionLineUtils {

	//#region 第一次分析
	/**
	 * 第一次编译，分析操作指令的地址模式，并分割表达式内容
	 * @param option 解析选项
	 */
	static FirstAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<InstructionLine>();
		if (!line.labelToken!.isEmpty) {
			let label = LabelUtils.CreateLabel(line.labelToken!, option);
			if (label) {
				label.labelType = LabelType.Label;
			}
		}
		delete (line.labelToken);

		let temp;
		if (temp = Platform.platform.MatchAddressingMode(line.instruction, line.expression!)) {
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
		delete (line.expression);
	}
	//#endregion 第一次分析

	//#region 第三次分析，并检查表达式是否有误
	static ThirdAnalyse(option: DecodeOption): void {
		const line = option.GetCurrectLine<InstructionLine>();
		for (let i = 0; i < line.exprParts.length; ++i)
			ExpressionUtils.CheckLabelsAndShowError(line.exprParts[i], option);
	}
	//#endregion 第三次分析，并检查表达式是否有误

	//#region 编译汇编指令
	/**编译汇编指令 */
	static CompileInstruction(option: DecodeOption): void {
		const line = option.GetCurrectLine<InstructionLine>();
		line.SetAddress();
		if (line.compileType === LineCompileType.Error)
			return;

		let label = LabelUtils.FindLabel(line.labelToken, option.macro);
		if (label) {
			label.value = line.orgAddress;
			delete (line.labelToken);
		}

		if (line.addressingMode.spProcess) {
			line.addressingMode.spProcess(option);
			line.AddAddress();
			return;
		}

		line.compileType = LineCompileType.Finished;
		if (!line.exprParts[0]) {
			line.SetResult(line.addressingMode.opCode[0]!, 0, line.addressingMode.opCodeLength[0]!);
			line.AddAddress();
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
			line.SetResult(line.addressingMode.opCode[length]!, 0, opCodeLength);
			let tempValue = line.SetResult(temp.value, opCodeLength, length);

			if (orgLength > length || temp.value < 0) {
				let errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.value, tempValue);
				let token = ExpressionUtils.CombineExpressionPart(line.exprParts[0]);
				MyDiagnostic.PushWarning(token, errorMsg);
			}
		}

		line.AddAddress();
	}
	//#endregion 编译汇编指令

}