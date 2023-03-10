import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

interface ConfidentLine {
	index: number;
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
	private static FirstAnalyse_If(option: CommandDecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;

		let result = option.includeCommandLines!;
		let index = 0;
		let commands = [".ELSEIF", ".ELSE", ".ENDIF"];

		let tag: ConfidentLine[] = [{ index: result[0].index, confident: false }];
		IfCondition.SplitExpression(line);

		for (let i = 1; i < result.length; i++) {
			let lineIndex = result[i].index;
			const tempLine = option.allLines[lineIndex] as ICommandLine;
			let searchIndex = commands.indexOf(tempLine.command.text);
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
			tag.push({ index: lineIndex, confident: false });
			option.allLines[lineIndex].compileType = LineCompileType.Finished;
		}

		line.tag = tag;
	}

	private static ThirdAnalyse_If(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let tag: ConfidentLine[] = line.tag;
		for (let i = 0; i < tag.length - 1; ++i) {
			const tempLine = option.allLines[tag[i].index] as ICommandLine;
			if (tempLine.expParts[0] && ExpressionUtils.CheckLabelsAndShowError(tempLine.expParts[0], option))
				tempLine.compileType = LineCompileType.Error;
		}
	}

	private static async Compile_If(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;

		let tag: ConfidentLine[] = line.tag;

		for (let i = 0; i < tag.length - 1; i++) {
			const tempLine = option.allLines[tag[i].index] as ICommandLine;
			if (tempLine.command.text === ".ELSE") {
				tag[i].confident = true;
				break;
			}

			let value = ExpressionUtils.GetExpressionValue(tempLine.expParts[0], ExpressionResult.GetResultAndShowError, option);
			if (value.success && value.value) {
				tag[i].confident = true;
				break;
			}
		}

		IfCondition.RemoveBaseLines(option, tag);
		return;
	}
	//#endregion IF命令

	//#region IFDEF IFNDEF 命令
	private static FirstAnalyse_IfDefOrNot(option: CommandDecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine
		let result = option.includeCommandLines!;
		let index = 0;
		let commands = [".ELSE", ".ENDIF"];

		let tag: ConfidentLine[] = [{ index: result[0].index, confident: false }];
		for (let i = 1; i < result.length; ++i) {
			const tempLine = option.allLines[result[i].index] as ICommandLine;
			let temp = commands.indexOf(tempLine.command.text);
			if (temp < index)
				continue;

			if (temp === 0)
				index = 1;

			tag.push({ index: result[i].index, confident: false });
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
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let tag: ConfidentLine[] = line.tag;

		for (let i = 0; i < tag.length - 1; ++i) {
			const tempLine = option.allLines[tag[i].index] as ICommandLine;
			if (line.command.text === ".ELSE") {
				tag[i].confident = true;
				break;
			}
			let label = LabelUtils.FindLabel(tempLine.expParts[0][0].token, option.macro);
			if (!!label === labelExist) {
				tag[i].confident = true;
				break;
			}
		}

		IfCondition.RemoveBaseLines(option, tag);
		return;
	}
	//#endregion IFDEF IFNDEF 命令

	//#region 移除行
	/**
	 * 移除行
	 * @param option 
	 * @param lines 
	 */
	private static RemoveBaseLines(option: DecodeOption, lines: ConfidentLine[]) {
		option.allLines.splice(lines[lines.length - 1].index, 1);
		for (let i = lines.length - 2; i >= 0; --i) {
			const line = lines[i];
			if (line.confident) {
				option.allLines.splice(line.index, 1);
			} else {
				option.allLines.splice(line.index, lines[i + 1].index - line.index);
			}
		}
		option.lineIndex--;
	}
	//#endregion 移除行

	//#region 分析行表达式
	private static SplitExpression(line: ICommandLine) {
		if (line.compileType === LineCompileType.Error) {
			delete (line.tag);
			return;
		}

		let expression: Token[] = line.tag;
		let temp = ExpressionUtils.SplitAndSort(expression[0]);
		if (temp)
			line.expParts[0] = temp;
		else
			line.compileType = LineCompileType.Error;

		delete (line.tag);
	}
	//#endregion 分析行表达式

}