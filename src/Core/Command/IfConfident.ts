import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Compiler } from "../Compiler/Compiler";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { ICommand, CommandTagBase } from "./Command";

// export interface IfConfidentLine {
// 	key: Token;
// 	exps: { parts: ExpressionPart[]; resultType: ExpressionType; }
// 	child: any[];
// }

export interface IfConfidentTag extends CommandTagBase {
	lines: (IfCommonLineTag & { exp?: Expression })[];
}

type IfDefTag = (IfCommonLineTag & { token?: Token })[];

type IfCommonLineTag = { offsetFirstLine: number, confident: boolean };

/**.IF */
export class IfConfident implements ICommand {

	start = { name: ".IF", min: 1, max: 1 };
	rest = [
		{ name: ".ELSEIF", min: 1, max: 1 },
		{ name: ".ELSE", min: 0, max: 0 }
	];
	end = ".ENDIF";
	allowLabel = false;

	AnalyseFirst(option: CompileOption) {
		this.Analyse(option);
	}

	AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag = line.tag as IfConfidentTag;

		for (let i = 0; i < tag.lines.length - 1; ++i) {
			const exp = tag.lines[i].exp;
			if (exp && ExpressionUtils.CheckLabels(option, exp)) {
				line.lineType = LineType.Error;
			}
		}
	}

	Compile(option: CompileOption) {
		const line = this.Analyse(option);
		if (line.lineType === LineType.Error)
			return;

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
		IfCommonUtils.MarkLineFinished(option, startIndex, tag.lines);
	}

	//#region 分析层级关系
	/**
	 * 分析层级关系
	 * @param option 
	 * @returns 
	 */
	private Analyse(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();

		const result = option.matchIndex!;
		let index = 0;

		let exp = ExpressionUtils.SplitAndSort(line.arguments[0]);
		const tag: IfConfidentTag = { exp, lines: [{ offsetFirstLine: 0, confident: false, exp }] };

		const commands = [".ELSEIF", ".ELSE", ".ENDIF"];
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
		return line;
	}
	//#endregion 分析层级关系

}

/**.IFDEF */
export class IfDefConfident implements ICommand {
	start = { name: ".IFDEF", min: 1, max: 1 };
	rest = [
		{ name: ".ELSE", min: 0, max: 0 }
	];
	end = ".ENDIF";
	allowLabel = false;

	AnalyseFirst(option: CompileOption) {
		IfDefConfidentUtils.AnalyseFirst(option);
	}

	Compile(option: CompileOption) {
		IfDefConfidentUtils.Compile(option, true);
	}
}

/**.IFNDEF */
export class IfNDefConfident implements ICommand {
	start = { name: ".IFNDEF", min: 1, max: 1 };
	rest = [
		{ name: ".ELSE", min: 0, max: 0 }
	];
	end = ".ENDIF";
	allowLabel = false;

	AnalyseFirst(option: CompileOption) {
		IfDefConfidentUtils.AnalyseFirst(option);
	}

	Compile(option: CompileOption) {
		IfDefConfidentUtils.Compile(option, false);
	}
}

class IfDefConfidentUtils {

	//#region 第一次分析，判断层级关系是否正确
	/**
	 * 第一次分析，判断层级关系是否正确
	 * @param option 编译选项
	 */
	static AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();

		const result = option.matchIndex!;
		let index = 0;
		const commands = [".ELSE", ".ENDIF"];

		const tag: IfDefTag = [{ offsetFirstLine: 0, confident: false, token: line.arguments[0] }];

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
					index = 1;
					break;
				case 1:
					index = 2;
					break;
			}

			tag.push({ offsetFirstLine: lineIndex - startLindeIndex, confident: false });
			option.GetLine(lineIndex).lineType = LineType.Finished;
		}

		line.tag = tag;
		return line;
	}
	//#endregion 第一次分析，判断层级关系是否正确

	//#region 编译结果
	static Compile(option: CompileOption, isDef: boolean) {
		const line = IfDefConfidentUtils.AnalyseFirst(option);
		const tag = line.tag as IfDefTag;

		const startIndex = option.index;
		for (let i = 0; i < tag.length - 1; i++) {
			const lineTag = tag[i];
			const line = option.GetLine<CommandLine>(startIndex + lineTag.offsetFirstLine);

			if (line.command.text.toUpperCase() === ".ELSE") {
				lineTag.confident = true;
				break;
			}

			if (!lineTag.token) {
				lineTag.confident = false;
				continue;
			}

			let label;
			label = LabelUtils.FindLabel(lineTag.token);
			if (!label)
				label = Compiler.enviroment.allMacro.get(lineTag.token.text);

			if ((label && isDef) || (!label && !isDef)) {
				lineTag.confident = true;
				break;
			}
		}

		line.lineType = LineType.Finished;
		IfCommonUtils.MarkLineFinished(option, startIndex, tag);
	}
	//#endregion 编译结果

}

class IfCommonUtils {

	//#region 标记该行已处理完毕
	/**
	 * 标记该行已处理完毕
	 * @param option 编译选项
	 * @param startIndex 起始行的Index
	 * @param offsetFirstLine 第一行的偏转
	 */
	static MarkLineFinished(option: CompileOption, startIndex: number, confidenLine: IfCommonLineTag[]) {
		for (let i = confidenLine.length - 2; i >= 0; --i) {
			const line = confidenLine[i];
			if (line.confident)
				continue;

			const start = startIndex + line.offsetFirstLine;
			const end = startIndex + confidenLine[i + 1].offsetFirstLine;
			for (let j = start; j < end; j++) {
				if (!option.allLines[j])
					continue;

				option.allLines[j].lineType = LineType.Ignore;
			}
		}
	}
	//#endregion 标记该行已处理完毕

}
