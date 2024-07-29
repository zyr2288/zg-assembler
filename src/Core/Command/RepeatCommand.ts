import { CompileOption } from "../Base/CompileOption";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { Utils } from "../Base/Utils";
import { Analyser } from "../Compiler/Analyser";
import { Compiler } from "../Compiler/Compiler";
import { CommandLine } from "../Lines/CommandLine";
import { CommonLine, LineType } from "../Lines/CommonLine";
import { CommandTagBase, ICommand } from "./Command";

interface RepeatTag extends CommandTagBase {
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
		this.AnalyseLines(option);
	}

	AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: RepeatTag = line.tag;

		ExpressionUtils.CheckLabels(option, tag.exp!);
	}

	async Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const exp = ExpressionUtils.SplitAndSort(line.arguments[0]);
		if (!exp) {
			line.lineType = LineType.Error;
			return;
		}

		let tag: RepeatTag | undefined;
		if (Compiler.FirstCompile()) {
			tag = this.AnalyseLines(option);
			if (!tag)
				return;

			const times = ExpressionUtils.GetValue(exp.parts, { macro: option.macro, tryValue: false });
			if (!times.success)
				return;

			const lines: CommonLine[] = [];
			while (times.value > 0) {
				const tempLines = Utils.DeepClone(line.tag.orgLines);
				lines.push(...tempLines);
				times.value--;
			}

			for (let i = 0; i < line.tag.orgLines.length; i++) {
				if (line.tag.orgLines[i])
					line.tag.orgLines[i].lineType = LineType.Finished;
			}

			line.tag.compileLines = lines;
		}
		tag = line.tag as RepeatTag;

		const repeatOp = new CompileOption();
		repeatOp.allLines = tag.compileLines;
		repeatOp.macro = option.macro;

		await Compiler.Compile(repeatOp);

		option.index += tag.orgLines.length + 1;
	}

	private AnalyseLines(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const temp = ExpressionUtils.SplitAndSort(line.arguments[0]);
		if (!temp) {
			line.lineType = LineType.Error;
			return;
		}

		const tag: RepeatTag = { exp: temp, orgLines: [], compileLines: [] };
		const endLineIndex = option.matchIndex![0];

		tag.orgLines = option.allLines.slice(option.index + 1, endLineIndex);

		option.allLines[endLineIndex].lineType = LineType.Ignore;
		line.tag = tag;
		return tag;
	}
}