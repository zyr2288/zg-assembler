import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { Utils } from "../Base/Utils";
import { Analyser } from "../Compiler/Analyser";
import { Compiler } from "../Compiler/Compiler";
import { CommandLine } from "../Lines/CommandLine";
import { CommonLine, LineType } from "../Lines/CommonLine";
import { ICommand } from "./Command";

interface RepeatTag {
	expression: Expression;
	orgLines: CommonLine[];
	compileLines: CommonLine[];
}

export class RepeatCommand implements ICommand {

	static GetResult(option: CompileOption, result: number[]) {
		const line = option.GetCurrent<CommandLine>();
		const tag: RepeatTag = line.tag;

		const tagOption = new CompileOption();
		tagOption.allLines = tag.compileLines;
		Compiler.GetLinesResult(tagOption, result);
	}

	start = { name: ".REPEAT", min: 1, max: 1 };
	end = ".ENDR";

	AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();

		const temp = ExpressionUtils.SplitAndSort(line.arguments[0]);
		if (!temp) {
			line.lineType = LineType.Error;
			return;
		}

		const tag: RepeatTag = { expression: temp, orgLines: [], compileLines: [] };
		const matchIndex = option.matchIndex![0];

		tag.orgLines = option.allLines.slice(option.index + 1, matchIndex);

		option.allLines[matchIndex].lineType = LineType.Finished;

		line.tag = tag;
	}

	AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: RepeatTag = line.tag;

		ExpressionUtils.CheckLabels(option, tag.expression);
	}

	async Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: RepeatTag = line.tag;

		if (Compiler.enviroment.compileTime === 0) {
			const times = ExpressionUtils.GetValue(tag.expression.parts, { macro: option.macro, tryValue: false });
			if (!times.success)
				return;

			const lines: CommonLine[] = [];
			while (times.value > 0) {
				const tempLines = Utils.DeepClone(tag.orgLines);
				lines.push(...tempLines);
				times.value--;
			}

			for (let i = 0; i < tag.orgLines.length; i++)
				tag.orgLines[i].lineType = LineType.Finished;

			tag.compileLines = lines;
		}
		line.tag = tag;

		const repeatOp = new CompileOption();
		repeatOp.allLines = tag.compileLines;
		repeatOp.macro = option.macro;

		await Analyser.Compile(repeatOp);

		option.index += tag.orgLines.length + 1;
	}
}