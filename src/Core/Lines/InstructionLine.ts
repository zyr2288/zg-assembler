import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { AsmCommon, IAddressingMode } from "../Platform/AsmCommon";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

/**汇编行 */
export class InstructionLine implements ICommonLine {

	type = LineType.Instruction;
	compileType = LineCompileType.None;
	orgText!: Token;

	orgAddress = -1;
	baseAddress = 0;

	labelToken?: Token;
	/**使用 labelHash 记忆，以免深拷贝时无法正确使用 */
	labelHash?: number;

	instruction!: Token;
	expression?: Token;
	expParts: ExpressionPart[][] = [];
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
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
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
		LabelUtils.GetLineLabelToken(option);

		let temp;
		if (temp = AsmCommon.MatchAddressingMode(line.instruction, line.expression!)) {
			line.addressingMode = temp.addressingMode;
			for (let i = 0; i < temp.exprs.length; i++) {
				let temp2 = ExpressionUtils.SplitAndSort(temp.exprs[i]);
				if (temp2) {
					line.expParts[i] = temp2;
				} else {
					line.compileType = LineCompileType.Error;
					line.expParts[i] = [];
				}
			}
		} else {
			line.compileType = LineCompileType.Error;
		}
		delete (line.expression);
	}
	//#endregion 第一次分析

	//#region 第三次分析，并检查表达式是否有误
	/**
	 * 第三次分析，并检查表达式是否有误
	 * @param option 编译选项
	 */
	static ThirdAnalyse(option: DecodeOption): void {
		const line = option.GetCurrectLine<InstructionLine>();
		for (let i = 0; i < line.expParts.length; ++i)
			ExpressionUtils.CheckLabelsAndShowError(line.expParts[i], option);
	}
	//#endregion 第三次分析，并检查表达式是否有误

	//#region 编译汇编指令
	/**
	 * 编译汇编指令
	 * @param option 编译选项
	 * @returns 
	 */
	static CompileInstruction(option: DecodeOption): void {
		const line = option.GetCurrectLine<InstructionLine>();
		line.SetAddress();
		if (line.compileType === LineCompileType.Error)
			return;

		const label = LabelUtils.FindLabelWithHash(line.labelHash, option.macro);
		if (label) {
			label.value = Compiler.enviroment.orgAddress;
			delete (line.labelHash);
		}

		if (line.addressingMode.spProcess) {
			line.addressingMode.spProcess(option);
			line.AddAddress();
			return;
		}

		line.compileType = LineCompileType.Finished;
		if (!line.expParts[0]) {
			line.SetResult(line.addressingMode.opCode[0]!, 0, line.addressingMode.opCodeLength[0]!);
			line.AddAddress();
			return;
		}

		const tryValue = Compiler.isLastCompile ? ExpressionResult.GetResultAndShowError : ExpressionResult.TryToGetResult;
		const temp = ExpressionUtils.GetExpressionValue(line.expParts[0], tryValue, option);
		if (!temp.success) {
			const index = line.addressingMode.opCode.length - 1;
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

			const opCodeLength = line.addressingMode.opCodeLength[length]!;
			line.SetResult(line.addressingMode.opCode[length]!, 0, opCodeLength);
			const tempValue = line.SetResult(temp.value, opCodeLength, length);

			if (orgLength > length || temp.value < 0) {
				const errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.value, tempValue);
				const token = ExpressionUtils.CombineExpressionPart(line.expParts[0]);
				MyDiagnostic.PushWarning(token, errorMsg);
			}
		}

		line.AddAddress();
	}
	//#endregion 编译汇编指令

}