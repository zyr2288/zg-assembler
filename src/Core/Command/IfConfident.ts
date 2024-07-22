import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { Analyser } from "../Compiler/Analyser";
import { ICommand, ICommandName, CommandTagBase } from "./Command";

// export interface IfConfidentLine {
// 	key: Token;
// 	exps: { parts: ExpressionPart[]; resultType: ExpressionType; }
// 	child: any[];
// }

export interface IfConfidentTag extends CommandTagBase {
	lines: { offsetFirstLine: number, confident: boolean, exp?: Expression }[];
}

const IfCommandRest = [".ELSEIF", ".ELSE", ".ENDIF"];
const IfDefCommandRest = [".ELSE", ".ENDIF"];

export class IfConfident implements ICommand {

	start = { name: ".IF", min: 1, max: 1 };
	rest = [
		{ name: ".ELSEIF", min: 1, max: 1 },
		{ name: ".ELSE", min: 0, max: 0 }
	];
	end = ".ENDIF";
	sameEnd = [".IFDEF", ".IFNDEF"];
	allowLabel = false;

	AnalyseFirst = IfConfidentUtils.AnalyseFirst;
	AnalyseThird = IfConfidentUtils.AnalyseThird;
	Compile = IfConfidentUtils.Compile;
}

export class IfDefConfident implements ICommand {
	start = { name: ".IFDEF", min: 1, max: 1 };
	rest = [
		{ name: ".ELSE", min: 0, max: 0 }
	];
	end = ".ENDIF";
	sameEnd = [".IF", ".IFNDEF"];
	allowLabel = false;
}

class IfConfidentUtils {

	//#region 第一次分析，判断层级关系是否正确
	/**
	 * 第一次分析，判断层级关系是否正确
	 * @param option 编译选项
	 */
	static AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();

		const result = option.matchIndex!;
		let index = 0;
		const commands = [".ELSEIF", ".ELSE", ".ENDIF"];

		let exp = ExpressionUtils.SplitAndSort(line.arguments[0]);

		const tag: IfConfidentTag = { exp, lines: [{ offsetFirstLine: 0, confident: false, exp }] };

		const startLindeIndex = option.index;
		for (let i = 0; i < result.length; i++) {
			const lineIndex = result[i];
			const tempLine = option.GetLine<CommandLine>(lineIndex);
			const searchIndex = commands.indexOf(tempLine.command.text.toUpperCase());
			if (searchIndex < index) {
				continue;
			}

			switch (searchIndex) {
				case 0:
					tempLine.tag = { exp: ExpressionUtils.SplitAndSort(line.arguments[0]) };
					break;
				case 1:
					index = 2;
					break;
			}


			if (tempLine.arguments[0]) {
				exp = ExpressionUtils.SplitAndSort(tempLine.arguments[0]);
				if (!exp)
					tempLine.lineType = LineType.Error;
			} else {
				exp = undefined;
			}

			tag.lines.push({ offsetFirstLine: lineIndex - startLindeIndex, confident: false, exp });
			option.GetLine(lineIndex).lineType = LineType.Finished;
		}

		line.tag = tag;
	}
	//#endregion 第一次分析，判断层级关系是否正确

	static AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag = line.tag as IfConfidentTag;

		for (let i = 0; i < tag.lines.length - 1; ++i) {
			const exp = tag.lines[i].exp;
			if (exp && ExpressionUtils.CheckLabels(option, exp)) {
				line.lineType = LineType.Error;
			}
		}
	}

	static Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag = line.tag as IfConfidentTag;

		const startIndex = option.index;
		for (let i = 0; i < tag.lines.length - 1; i++) {
			const confident = tag.lines[i];
			const line = option.allLines[startIndex + confident.offsetFirstLine] as CommandLine;

			if (line.command.text.toUpperCase() === ".ELSE") {
				confident.confident = true;
				break;
			}

			const value = ExpressionUtils.GetValue(confident.exp!.parts, { macro: option.macro, tryValue: false });
			if (value.success && value.value) {
				tag.lines[i].confident = true;
				break;
			}
		}

		line.lineType = LineType.Finished;
		IfConfidentUtils.MarkLineFinished(option, startIndex, tag.lines);
	}

	//#region 标记该行已处理完毕
	/**
	 * 标记该行已处理完毕
	 * @param option 编译选项
	 * @param startIndex 起始行的Index
	 * @param offsetFirstLine 第一行的偏转
	 */
	private static MarkLineFinished(option: CompileOption, startIndex: number, confidenLine: IfConfidentTag["lines"]) {
		for (let i = confidenLine.length - 2; i >= 0; --i) {
			const line = confidenLine[i];
			if (line.confident)
				continue;

			const start = startIndex + line.offsetFirstLine;
			const end = startIndex + confidenLine[i + 1].offsetFirstLine;
			for (let j = start; j < end; j++) {
				if (!option.allLines[j])
					continue;

				option.allLines[j].lineType = LineType.Finished;
			}
		}
	}
	//#endregion 标记该行已处理完毕

}