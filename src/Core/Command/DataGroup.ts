//#region 数据组

import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionUtils, PriorityType } from "../Base/ExpressionUtils";
import { ILabelNormal, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Analyser } from "../Compiler/Analyser";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { Command, ICommand } from "./Command";

export interface DataGroupTag {
	name: Token;
	dataGroup: DataGroup;
	expressions: Expression[];
}

/**
 * 数据组
 */
export class DataGroup {

	/**数据组的标签 */
	label!: ILabelNormal;
	/**key是标签是文本 */
	labelAndIndex: Map<string, { token: Token, index: number }[]> = new Map();

	PushData(token: Token, index: number) {
		const labelMap = this.labelAndIndex.get(token.text) ?? [];
		labelMap.push({ token, index });
		this.labelAndIndex.set(token.text, labelMap);
	}

	/**
	 * 查找数据
	 * @param text 文本
	 * @param index 查找的Index
	 * @returns 
	 */
	FindData(text: string, index: number) {
		const labelMap = this.labelAndIndex.get(text);
		if (!labelMap)
			return;

		return labelMap[index];
	}
}
//#endregion 数据组

export class DBGCommand implements ICommand {
	start = { name: ".DBG", min: 1, max: 1 };
	end = ".ENDD";
	allowLabel = false;

	AnalyseFirst = DataGroupUtils.AnalyseFirst;
	AnalyseThird = DataGroupUtils.AnalyseThird;
	Compile(option: CompileOption) {
		DataGroupUtils.Compile(option, 1);
	}
}

export class DWGCommand implements ICommand {
	start = { name: ".DWG", min: 1, max: 1 };
	end = ".ENDD";
	allowLabel = false;

	AnalyseFirst = DataGroupUtils.AnalyseFirst;
	AnalyseThird = DataGroupUtils.AnalyseThird;
	Compile(option: CompileOption) {
		DataGroupUtils.Compile(option, 2);
	}
}

export class DLGCommand implements ICommand {
	start = { name: ".DLG", min: 1, max: 1 };
	end = ".ENDD";
	allowLabel = false;

	AnalyseFirst = DataGroupUtils.AnalyseFirst;
	AnalyseThird = DataGroupUtils.AnalyseThird;
	Compile(option: CompileOption) {
		DataGroupUtils.Compile(option, 4);
	}
}

class DataGroupUtils {
	static AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const start = option.index + 1;
		const matchEnd = option.matchIndex![0];

		const tag: DataGroupTag = { dataGroup: new DataGroup(), name: line.arguments[0], expressions: [] };
		if (Compiler.enviroment.compileTime < 0) {
			const label = LabelUtils.CreateCommonLabel(tag.name, { ableNameless: false });
			if (label) {
				label.type = LabelType.Label;
				label.comment = line.comment;
				Compiler.enviroment.allDataGroup.set(tag.name.text, tag.dataGroup);
			}
		}

		const lines = option.allLines.slice(start, matchEnd);

		Command.MarkLineFinished(option, start, matchEnd);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line)
				continue;

			let tokens: Token[] | undefined;
			switch (line.key) {
				case "label":
				case "macro":
					console.error("不可能是这种行");
					continue;
				default:
					tokens = Analyser.SplitComma(line.org);
					if (!tokens)
						continue;

					for (let j = 0; j < tokens.length; j++) {
						const expression = ExpressionUtils.SplitAndSort(tokens[j]);
						if (expression) {
							tag.expressions[j] = expression;
							DataGroupUtils.AddExpressionPart(tag.dataGroup, expression, j);
						}
					}
					break;
			}
		}

		line.tag = tag;
	}

	static AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DataGroupTag = line.tag;
		ExpressionUtils.CheckLabels(option, ...tag.expressions);
	}

	static Compile(option: CompileOption, dataLength: number) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DataGroupTag = line.tag;

		line.lineResult.SetAddress();
		line.lineResult.result.length = tag.expressions.length * dataLength;

		const label = LabelUtils.CreateCommonLabel(tag.name, { ableNameless: false });
		if (label) {
			label.value = Compiler.enviroment.address.org;
			label.type = LabelType.Label;
			label.comment = line.comment;
		}
		line.lineType = LineType.Finished;

		let index = 0;
		for (let i = 0; i < tag.expressions.length; i++) {
			const temp = ExpressionUtils.GetValue(tag.expressions[i].parts, option);
			if (temp.success) {
				const tempValue = line.lineResult.SetResult(temp.value, index, dataLength);
				if (tempValue.overflow) {
					const token = ExpressionUtils.CombineExpressionPart(tag.expressions[i].parts);
					const errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.value, tempValue.result);
					MyDiagnostic.PushWarning(token, errorMsg);
				}
			} else {
				line.lineType = LineType.None;
			}
			index += dataLength;
		}
		line.lineResult.AddAddress();
	}

	private static AddExpressionPart(datagroup: DataGroup, exps: Expression, dataIndex: number) {
		for (let i = 0; i < exps.parts.length; i++) {
			const part = exps.parts[i];
			if (part.type !== PriorityType.Level_1_Label)
				continue;

			datagroup.PushData(part.token, dataIndex);
		}
	}
}