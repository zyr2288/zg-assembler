import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { MyException } from "../Base/MyException";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Localization } from "../I18n/Localization";
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
		for (let i = 1; i < result.length; i++) {
			let temp = commands.indexOf(result[i].match);
			if (temp < index)
				continue;

			if (temp === 1)
				index++;

			tag.push({ index: result[i].index, confident: false });
		}

		line.tag = tag;
	}

	private static ThirdAnalyse_If(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let tag: ConfidentLine[] = line.tag;
		for (let i = 0; i < tag.length - 1; i++) {
			const tempLine = option.allLines[tag[i].index] as ICommandLine;
			if (tempLine.command.text !== ".ELSE") {
				if (!tempLine.expParts[0]) {
					let errorMsg = Localization.GetMessage("Command arguments error");
					MyException.PushException(tempLine.command, errorMsg);
					tempLine.compileType = LineCompileType.Error;
				}

				continue;
			}

			ExpressionUtils.CheckLabelsAndShowError(tempLine.expParts[0]);
		}
		return;
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

			let expParts = i == 0 ? tempLine.tag[1] : tempLine.tag;
			let value = ExpressionUtils.GetExpressionValue(expParts, ExpressionResult.GetResultAndShowError, option);
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
		for (let i = 1; i < result.length; i++) {
			let temp = commands.indexOf(result[i].match);
			if (temp < index)
				continue;

			if (temp === 0)
				index++;

			tag.push({ index: result[i].index, confident: false });
		}

		line.tag = tag;
		return;
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

		for (let i = 0; i < tag.length - 1; i++) {
			const tempLine = option.allLines[tag[i].index] as ICommandLine;
			if (line.command.text === ".ELSE") {
				tag[i].confident = true;
				break;
			}
			let label = LabelUtils.FindLabel(tempLine.expParts[0][0].token, option);
			if (!!label === labelExist) {
				tag[i].confident = true;
				break;
			}
		}

		IfCondition.RemoveBaseLines(option, tag);
		return;
	}
	//#endregion IFDEF IFNDEF 命令

	/**
	 * 移除行
	 * @param option 
	 * @param indexs 
	 */
	private static RemoveBaseLines(option: DecodeOption, indexs: ConfidentLine[]) {
		option.allLines.splice(indexs[indexs.length - 1].index, 1);
		for (let i = indexs.length - 2; i >= 0; i--) {
			if (!indexs[i].confident)
				option.allLines.splice(indexs[i].index, indexs[i + 1].index - indexs[i].index);
			else
				option.allLines.splice(indexs[i].index, 1);
		}
		option.lineIndex--;
	}

}