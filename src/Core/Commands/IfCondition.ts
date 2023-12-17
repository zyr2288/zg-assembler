import { ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { DecodeOption, IncludeLine } from "../Base/Options";
import { Token } from "../Base/Token";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

interface ConfidentLine {
	/**与第一行相差多少 */
	offsetFirstLine: number;
	/**该行判断结果 */
	confident: boolean;
}

export class IfCondition {

	static Initialize() {
		Commands.AddCommand({
			name: ".IF", end: ".ENDIF", min: 1, label: false, nested: true,
			includes: [{ name: ".ELSEIF", min: 1 }, { name: ".ELSE", min: 0 }],
			firstAnalyse: IfCondition.FirstAnalyse_If,
			thirdAnalyse: IfCondition.ThirdAnalyse_If,
			compile: IfCondition.Compile_If
		});

		Commands.AddCommand({
			name: ".IFDEF", end: ".ENDIF", min: 1, label: false, nested: true,
			includes: [{ name: ".ELSE", min: 0 }],
			firstAnalyse: IfCondition.FirstAnalyse_IfDefOrNot,
			compile: IfCondition.Compile_IfDef
		});

		Commands.AddCommand({
			name: ".IFNDEF", end: ".ENDIF", min: 1, label: false, nested: true,
			includes: [{ name: ".ELSE", min: 0 }],
			firstAnalyse: IfCondition.FirstAnalyse_IfDefOrNot,
			compile: IfCondition.Compile_IfNDef
		});
	}

	//#region IF命令
	private static FirstAnalyse_If(option: DecodeOption, include?: IncludeLine[]) {
		const line = option.GetCurrectLine<CommandLine>();
		const result = include!;
		let index = 0;
		const commands = [".ELSEIF", ".ELSE", ".ENDIF"];

		const tag: ConfidentLine[] = [{ offsetFirstLine: 0, confident: false }];
		IfCondition.SplitExpression(line);

		const startLindeIndex = result[0].index;
		for (let i = 1; i < result.length; i++) {
			const lineIndex = result[i].index;
			const tempLine = option.GetLine<CommandLine>(lineIndex);
			const searchIndex = commands.indexOf(tempLine.command.text);
			if (searchIndex < index)
				continue;

			switch (searchIndex) {
				case 0:
					IfCondition.SplitExpression(tempLine);
					break;
				case 1:
					index = 2;
					break;
			}
			tag.push({ offsetFirstLine: lineIndex - startLindeIndex, confident: false });
			option.GetLine(lineIndex).compileType = LineCompileType.Finished;
		}

		line.tag = tag;
	}

	private static ThirdAnalyse_If(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const tag: ConfidentLine[] = line.tag;
		const currectLineIndex = option.allLines.indexOf(line);
		for (let i = 0; i < tag.length - 1; ++i) {
			const tempLine = option.GetLine<CommandLine>(currectLineIndex + tag[i].offsetFirstLine);
			if (tempLine.expParts[0] && ExpressionUtils.CheckLabelsAndShowError(tempLine.expParts[0], option))
				tempLine.compileType = LineCompileType.Error;
		}
	}

	private static async Compile_If(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const tag: ConfidentLine[] = line.tag;

		const startLineIndex = option.allLines.indexOf(line);
		for (let i = 0; i < tag.length - 1; i++) {
			const tempLine = option.GetLine<CommandLine>(startLineIndex + tag[i].offsetFirstLine);
			if (tempLine.command.text === ".ELSE") {
				tag[i].confident = true;
				break;
			}

			const analyseOption: ExpAnalyseOption = { analyseType: "GetAndShowError" };
			const value = ExpressionUtils.GetExpressionValue<number>(tempLine.expParts[0], option, analyseOption);
			if (value.success && value.value) {
				tag[i].confident = true;
				break;
			}
		}

		IfCondition.RemoveBaseLines(option, startLineIndex, tag);
	}
	//#endregion IF命令

	//#region IFDEF IFNDEF 命令
	private static FirstAnalyse_IfDefOrNot(option: DecodeOption, include?: IncludeLine[]) {
		const line = option.GetCurrectLine<CommandLine>();
		const result = include!;
		const commands = [".ELSE", ".ENDIF"];

		const tag: ConfidentLine[] = [{ offsetFirstLine: 0, confident: false }];

		let index = 0;
		let startLindeIndex = result[0].index;

		for (let i = 1; i < result.length; ++i) {
			const lineIndex = result[i].index;
			const tempLine = option.GetLine<CommandLine>(result[i].index);
			const temp = commands.indexOf(tempLine.command.text);
			if (temp < index)
				continue;

			if (temp === 0)
				index = 1;

			tempLine.compileType = LineCompileType.Finished;
			tag.push({ offsetFirstLine: lineIndex - startLindeIndex, confident: false });
			startLindeIndex = lineIndex;
		}

		line.tag = tag;
	}

	private static Compile_IfDef(option: DecodeOption) {
		IfCondition.Compile_IfDefOrNot(true, option);
	}

	private static Compile_IfNDef(option: DecodeOption) {
		IfCondition.Compile_IfDefOrNot(false, option);
	}

	private static Compile_IfDefOrNot(labelExist: boolean, option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const tag: ConfidentLine[] = line.tag;

		const startLine = option.allLines.indexOf(line);
		for (let i = 0; i < tag.length - 1; ++i) {
			const tempLine = option.GetLine<CommandLine>(startLine + tag[i].offsetFirstLine);
			if (line.command.text === ".ELSE") {
				tag[i].confident = true;
				break;
			}
			const label = LabelUtils.FindLabel(tempLine.expParts[0][0].token, option.macro);
			if (!!label === labelExist) {
				tag[i].confident = true;
				break;
			}
		}

		IfCondition.RemoveBaseLines(option, startLine, tag);
		return;
	}
	//#endregion IFDEF IFNDEF 命令

	//#region 标记该行已处理完毕
	/**
	 * 标记该行已处理完毕
	 * @param option 
	 * @param lines 
	 */
	private static RemoveBaseLines(option: DecodeOption, startLineIndex: number, lines: ConfidentLine[]) {
		option.allLines.splice(startLineIndex + lines[lines.length - 1].offsetFirstLine, 1);
		for (let i = lines.length - 2; i >= 0; --i) {
			const line = lines[i];
			if (line.confident) {
				option.allLines.splice(startLineIndex + line.offsetFirstLine, 1);
			} else {
				const startIndex = startLineIndex + line.offsetFirstLine
				const length = lines[i + 1].offsetFirstLine - line.offsetFirstLine;
				option.allLines.splice(startIndex, length);
			}
		}
		option.lineIndex--;
	}
	//#endregion 标记该行已处理完毕

	//#region 分析行表达式
	private static SplitExpression(line: CommandLine) {
		if (line.compileType === LineCompileType.Error) {
			delete (line.tag);
			return;
		}

		const expression: Token[] = line.tag;
		const temp = ExpressionUtils.SplitAndSort(expression[0]);
		if (temp)
			line.expParts[0] = temp;
		else
			line.compileType = LineCompileType.Error;

		delete (line.tag);
	}
	//#endregion 分析行表达式

}