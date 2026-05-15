import { Expression, ExpressionUtils, PriorityType } from "../Base/ExpressionUtils";
import { ICommand } from "./Command";
import { CompileOption } from "../Base/CompileOption";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { Localization } from "../I18n/Localization";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Compiler } from "../Compiler/Compiler";
import { Utils } from "../Base/Utils";
import { HighlightType } from "../LanguageHelper/HighlightingProvider";
import { Macro } from "../Base/Macro";

export type DataCommandTag = Expression[];

export class DBCommand implements ICommand {
	start = { name: ".DB", min: 1 };
	AnalyseFirst = DataCommand.AnalyseFirst;
	AnalyseThird = DataCommand.AnalyseThird;

	Compile(option: CompileOption) {
		DataCommand.Compile(1, option);
	}
}

export class DWCommand implements ICommand {
	start = { name: ".DW", min: 1 };
	AnalyseFirst = DataCommand.AnalyseFirst;
	AnalyseThird = DataCommand.AnalyseThird;

	Compile(option: CompileOption) {
		DataCommand.Compile(2, option);
	}
}

export class DLCommand implements ICommand {
	start = { name: ".DL", min: 1 };
	AnalyseFirst = DataCommand.AnalyseFirst;
	AnalyseThird = DataCommand.AnalyseThird;

	Compile(option: CompileOption) {
		DataCommand.Compile(4, option);
	}
}

export class DataCommand {

	static AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DataCommandTag = [];
		for (let i = 0; i < line.arguments.length; i++) {
			const part = ExpressionUtils.SplitAndSort(line.arguments[i], option);
			if (!part) {
				line.lineType = LineType.Error;
				continue;
			}
			tag[i] = part;
		}
		line.tag = tag;
	}

	static AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DataCommandTag = line.tag;
		ExpressionUtils.CheckLabels(option, ...tag);
	}

	static Compile(dataLength: number, option: CompileOption) {
		if (Compiler.FirstCompile())
			DataCommand.AnalyseFirst(option);

		const line = option.GetCurrent<CommandLine>();
		line.lineResult.SetAddress();

		line.lineType = LineType.Finished;
		const tag: DataCommandTag = line.tag;

		let index = 0;
		for (let i = 0; i < tag.length; i++) {
			const exp = tag[i];
			const temp = DataCommand.GetStringValue(exp, option);
			if (!temp.success) {
				line.lineType = LineType.None;
				line.lineResult.result.length += temp.values.length * dataLength;
				index += temp.values.length * dataLength;
			} else {
				for (let j = 0; j < temp.values.length; j++) {
					const temp2 = line.lineResult.SetResult(temp.values[j], index, dataLength);
					if (temp2.overflow) {
						const errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.values[j], temp2.result);
						const token = ExpressionUtils.CombineExpressionPart(exp.parts);
						MyDiagnostic.PushWarning(token, errorMsg);
					}
					index += dataLength;
				}
			}
		}

		line.lineResult.AddAddress();
	}

	//#region 获取包含字符串的结果值
	/**
	 * 获取包含字符串的结果值
	 * @param expression 表达式
	 * @param option 编译选项
	 * @param analyseOption 分析选项
	 * @returns 
	 */
	private static GetStringValue(expression: Expression, option?: { macro?: Macro, tryValue?: boolean }) {
		const result = { success: true, values: [] as number[] };

		if (expression.stringIndex < 0)
			result.values.length = 1;
		else
			result.values.length = expression.parts[expression.stringIndex].chars!.length;


		const index = expression.stringIndex;
		if (index < 0) {
			result.values.length = 1;
			const temp = ExpressionUtils.GetValue(expression.parts, option);
			result.success = temp.success;
			if (temp.success)
				result.values[0] = temp.value;
		} else {
			for (let i = 0; i < result.values.length; i++) {
				const part = Utils.DeepClone(expression.parts);
				part[index] = {
					token: expression.parts[index].token.Copy(),
					value: 0,
					type: PriorityType.Level_0_Sure,
					highlightType: HighlightType.Number,
				};
				delete (part[index].chars);

				part[index].value = ExpressionUtils.GetCharCode(expression.parts[index].chars![i]);
				const temp = ExpressionUtils.GetValue(part, option);
				if (!temp.success) {
					result.success = temp.success;
					break;
				}

				result.values[i] = temp.value;
			}
		}
		return result;
	}
	//#endregion 获取包含字符串的结果值

	private static SplitString() {

	}
}