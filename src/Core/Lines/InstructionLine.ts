import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { IAddressingMode, Platform } from "../Platform/Platform";
import { LineResult, LineType } from "./CommonLine";
import { LabelLine } from "./LabelLine";

export class InstructionLine {

	/**创建一个编译行 */
	static Create(org: Token, content: { pre: Token, main: Token, rest: Token }, comment?: string) {

		const line = new InstructionLine();
		line.org = org;
		line.instruction = content.main;

		line.label = LabelLine.Create(content.pre, comment);

		const temp = Platform.MatchAddressingMode(line.instruction, content.rest);
		if (temp) {
			line.addressMode = temp.addressingMode;
			for (let i = 0; i < temp.exprs.length; i++) {
				const token = temp.exprs[i];
				const temp2 = ExpressionUtils.SplitAndSort(token);
				if (temp2)
					line.expressions[i] = temp2;
			}
			return line;
		}
	}

	/***** class *****/

	key: "instruction" = "instruction";
	org!: Token;
	comment?:string;
	lineType: LineType = LineType.None;

	label?: LabelLine;

	instruction!: Token;
	expressions: Expression[] = [];
	addressMode!: IAddressingMode;

	lineResult = new LineResult();

	/**第一次分析 */
	AnalyseFirst(option: CompileOption) {
		this.label?.Analyse();
	}

	/**第三次分析 */
	AnalyseThird(option: CompileOption) {
		ExpressionUtils.CheckLabels(option, ...this.expressions);
	}

	/**编译结果 */
	Compile(option: CompileOption) {
		this.lineResult.SetAddress();
		this.label?.Compile(option);

		if (this.addressMode?.spProcess) {
			this.addressMode.spProcess(option);
			this.lineResult.AddAddress();
			return;
		}

		this.lineType = LineType.Finished;
		if (this.expressions.length === 0) {
			this.lineResult.SetResult(this.addressMode.opCode[0]!, 0, this.addressMode.opCodeLength[0]!);
			this.lineResult.AddAddress();
			return;
		}

		// 多个表达式结果请用特殊处理，spProcess
		const temp = ExpressionUtils.GetValue(this.expressions[0].parts, option);
		if (!temp.success) {
			const index = this.addressMode.opCode.length - 1;
			this.lineResult.result.length = this.addressMode.opCodeLength[index]! + index;
			this.lineType = LineType.None;
		} else {
			let length = Utils.GetNumberByteLength(temp.value);
			if (this.lineResult.resultLength !== 0) {
				length = this.lineResult.resultLength - 1;
			} else {
				if (!this.addressMode.opCode[length]) {
					for (let i = 0; i < this.addressMode.opCode.length; ++i) {
						if (!this.addressMode.opCode[i])
							continue;

						length = i;
						break;
					}
				}
			}

			const opCodeLength = this.addressMode.opCodeLength[length]!;
			this.lineResult.SetResult(this.addressMode.opCode[length]!, 0, opCodeLength);

			const org = this.lineResult.SetResult(temp.value, opCodeLength, length);

			if (org.overflow) {
				const errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.value, org.result);
				const token = ExpressionUtils.CombineExpressionPart(this.expressions[0].parts);
				MyDiagnostic.PushWarning(token, errorMsg);
			}
		}

		this.lineResult.AddAddress();
	}
}