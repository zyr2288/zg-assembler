import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { Compiler } from "../Compiler/Compiler";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { ICommand } from "./Command";

export type AddressTag = Expression;

export class Original implements ICommand {
	start = { name: ".ORG", min: 1, max: 1 };
	AnalyseFirst = AddressUtils.AnalyseFirst;
	AnalyseThird = AddressUtils.AnalyseThird;

	Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: AddressTag = line.tag;
		const temp = ExpressionUtils.GetValue(tag.parts, { macro: option.macro, tryValue: false });
		if (!temp.success || temp.value < 0) {
			line.lineType = LineType.Error;
			return;
		}

		line.lineType = LineType.Finished;
		const temp2 = Compiler.enviroment.address.org;
		Compiler.enviroment.address.org = temp.value;
		if (Compiler.enviroment.address.base < 0)
			Compiler.enviroment.address.base = 0;

		if (temp2 >= 0) {
			Compiler.enviroment.address.base = Compiler.enviroment.address.org + Compiler.enviroment.address.offset;
		} else {
			Compiler.enviroment.address.offset = Compiler.enviroment.address.base - Compiler.enviroment.address.offset;
		}
	}
}

export class Base implements ICommand {
	start = { name: ".BASE", min: 1, max: 1 };
	AnalyseFirst = AddressUtils.AnalyseFirst;
	AnalyseThird = AddressUtils.AnalyseThird;

	Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: AddressTag = line.tag;
		const temp = ExpressionUtils.GetValue(tag.parts, { macro: option.macro, tryValue: false });
		if (!temp.success || temp.value < 0) {
			line.lineType = LineType.Error;
			return;
		}

		line.lineType = LineType.Finished;
		Compiler.enviroment.address.base = temp.value;
		Compiler.enviroment.address.offset = Compiler.enviroment.address.base - Compiler.enviroment.address.offset;
	}
}

class AddressUtils {

	static AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag = ExpressionUtils.SplitAndSort(line.arguments[0]);
		if (!tag) {
			line.lineType = LineType.Error;
			return;
		}

		line.tag = tag;
	}

	static AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: AddressTag = line.tag;
		ExpressionUtils.CheckLabels(option, tag);
	}
}