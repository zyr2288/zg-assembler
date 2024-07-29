import { CompileOption } from "../Base/CompileOption";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabelCommon, LabelUtils } from "../Base/Label";
import { Compiler } from "../Compiler/Compiler";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { CommandTagBase, ICommand } from "./Command";

export interface DefTag extends CommandTagBase {
	label?: ILabelCommon;
}

export class DefinedCommand implements ICommand {

	start = { name: ".DEF", min: 2, max: 2 };
	allowLabel = false;

	AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DefTag = {};

		const label = LabelUtils.CreateCommonLabel(line.arguments[0], { ableNameless: false, comment: line.comment });
		tag.label = label;

		const exp = ExpressionUtils.SplitAndSort(line.arguments[1]);
		if (exp)
			tag.exp = exp;

		line.tag = tag;
	}

	AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: DefTag = line.tag;
		if (tag.exp) {
			if (ExpressionUtils.CheckLabels(option, tag.exp) || !tag.label)
				return;

			const value = ExpressionUtils.GetValue(tag.exp.parts, option);
			if (value.success)
				tag.label.value = value.value;
		}
	}

	Compile(option: CompileOption) {
		if (Compiler.FirstCompile())
			this.AnalyseFirst(option);

		const line = option.GetCurrent<CommandLine>();
		const tag: DefTag = line.tag;

		if (!tag.label || !tag.exp) {
			line.lineType = LineType.Error;
			return;
		}

		const temp = ExpressionUtils.GetValue(tag.exp.parts, option);
		if (temp.success) {
			tag.label.value = temp.value;
			line.lineType = LineType.Finished;
		}
	}
}