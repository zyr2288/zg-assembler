import { CompileOption } from "../Base/CompileOption";
import { Compiler } from "../Compiler/Compiler";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabelCommon, LabelType, LabelUtils } from "../Base/Label";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { ICommand } from "./Command";

export interface DefTag {
	label?: ILabelCommon;
	expression?: Expression;
}

export class DefinedCommand implements ICommand {

	start = { name: ".DEF", min: 2, max: 2 };
	allowLabel = false;

	AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DefTag = {};

		if (Compiler.enviroment.compileTime < 0) {
			const label = LabelUtils.CreateCommonLabel(line.arguments[0], { ableNameless: false, comment: line.comment });
			tag.label = label;
		}

		const exp = ExpressionUtils.SplitAndSort(line.arguments[1]);
		if (exp)
			tag.expression = exp;

		line.tag = tag;
	}

	AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DefTag = line.tag;
		if (tag.expression) {
			if (ExpressionUtils.CheckLabels(option, tag.expression) || !tag.label)
				return;

			const value = ExpressionUtils.GetValue(tag.expression.parts, option);
			if (value.success)
				tag.label.value = value.value;
		}
	}

	Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DefTag = line.tag;

		if (Compiler.enviroment.compileTime === 0) {
			line.arguments[0] = line.arguments[0].Trim();
			tag.label = LabelUtils.CreateCommonLabel(line.arguments[0], { ableNameless: false, comment: line.comment });
			if (!tag.label) {
				line.lineType = LineType.Error;
				return;
			}
			tag.label.type = LabelType.Defined;
		}

		const temp = ExpressionUtils.GetValue(tag.expression!.parts, option);
		if (temp.success) {
			tag.label!.value = temp.value;
			line.lineType = LineType.Finished;
		}
	}
}