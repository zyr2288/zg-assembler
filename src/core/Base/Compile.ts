import { BaseLineType, BaseLineUtils, IBaseLine } from "../BaseLine/BaseLine";
import { CommandLine } from "../BaseLine/CommandLine";
import { ExpressionLine } from "../BaseLine/ExpressionLine";
import { InstructionLine } from "../BaseLine/InstructionLine";
import { MacroLine } from "../BaseLine/MacroLine";
import { Platform } from "../Platform/Platform";
import { LabelUtils } from "../Utils/LabelUtils";
import { LexerUtils } from "../Utils/LexerUtils";
import { MacroUtils } from "../Utils/MacroUtils";
import { Commands } from "./Commands";
import { CommonOption } from "./CommonOption";
import { Config } from "./Config";
import { GlobalVar } from "./GlobalVar";
import { LabelDefinedState } from "./Label";
import { MyException } from "./MyException";
import { Token, TokenType } from "./Token";

export class Compile {

	//#region 解析文本
	/**
	 * 解析文本
	 * @param files {text:文本, filePath:文件路径}
	 * @returns 
	 */
	static async DecodeText(files: { text: string, filePath: string }[]) {
		await GlobalVar.SwitchEnvironment("Editor");
		GlobalVar.isCompiling = true;
		let allLines: IBaseLine[] = [];

		for (let i = 0; i < files.length; i++) {
			let hash = GlobalVar.env.SetFile(files[i].filePath);
			LabelUtils.DeleteLabel(hash);
			MacroUtils.DeleteMacro(hash);
			MyException.ClearFileError(hash);

			let tempLines = Compile.GetAllBaseLine(files[i].text, hash);
			let option: CommonOption = { allLine: tempLines, lineIndex: 0 };
			await Compile.FirstAnalyse(option);
			await Compile.SecondAnalyse(option);

			if (!GlobalVar.env.fileBaseLines[hash])
				GlobalVar.env.fileBaseLines[hash] = [];

			GlobalVar.env.fileBaseLines[hash] = tempLines;
			allLines.push(...tempLines);
		}

		let option: CommonOption = { allLine: allLines, lineIndex: 0 };
		await Compile.ThirdAnalyse(option);
		GlobalVar.isCompiling = false;
	}
	//#endregion 解析文本

	//#region 编译文本
	static async CompileText(text: string, filePath: string) {
		await GlobalVar.SwitchEnvironment("Compile");
		GlobalVar.isCompiling = true;
		GlobalVar.env.isCompile = true;

		GlobalVar.env.ClearAll();
		MyException.ClearAll();

		let hash = GlobalVar.env.SetFile(filePath);
		let tempLines = Compile.GetAllBaseLine(text, hash);
		let option: CommonOption = { allLine: tempLines, lineIndex: 0 };
		await Compile.FirstAnalyse(option);
		await Compile.SecondAnalyse(option);
		await Compile.ThirdAnalyse(option);

		GlobalVar.env.compileCount = 0;
		if (!MyException.isError) {
			while (GlobalVar.env.compileCount < Config.ProjectSetting.compileTimes) {
				await Compile.CompileAndGetResult(option);
				GlobalVar.env.compileCount++;
			}
		}

		let result: number[] = [];
		if (!MyException.isError) {
			Compile.GetAllBaseLineResult(tempLines, result);
		}

		GlobalVar.isCompiling = false;
		return result;
	}
	//#endregion 编译文本

	/***** 三次基本分析 *****/

	//#region 仅仅分割每一行，并不做其它分析
	static GetAllBaseLine(text: string, fileHash: number) {
		let lines = text.split(/\r?\n/g);
		let baseLines: IBaseLine[] = [];
		lines.forEach((value, index) => {
			let temp = BaseLineUtils.GetLineType(value, fileHash, index);
			if (temp) baseLines.push(temp);
		});
		return baseLines;
	}
	//#endregion 仅仅分割每一行，并不做其它分析

	//#region 第一次分析，分析标签，自定义函数，命令基本参数个数是否符合等
	/**
	 * 第一次分析，分析标签，自定义函数，命令基本参数个数是否符合等
	 * @param option 通用编译选项
	 */
	static async FirstAnalyse(option: CommonOption) {
		for (let i = 0; i < option.allLine.length; i++) {
			const line = option.allLine[i];
			if (line.errorLine)
				continue;

			option.lineIndex = i;

			switch (line.lineType) {
				case BaseLineType.Instruction:
					InstructionLine.FirstAnalyse(option);
					break;
				case BaseLineType.Command:
					await Commands.FirstAnalyse(option);
					break;
				case BaseLineType.Expression:
					ExpressionLine.FirstAnalyse(option);
					break;
			}

			i = option.lineIndex;
		}
	}
	//#endregion 第一次分析，分析标签，自定义函数，命令基本参数个数是否符合等

	//#region 第二次分析，分析是自定义函数或标签
	static async SecondAnalyse(option: CommonOption) {
		for (let i = 0; i < option.allLine.length; i++) {
			let line = option.allLine[i];
			if (line.errorLine)
				continue;

			option.lineIndex = i;
			switch (line.lineType) {
				case BaseLineType.Unknow:
					let match = MacroUtils.MatchMacro(line.orgText.text);
					if (match) {
						let temp = BaseLineUtils.GetMatchLineParts(line.orgText, match);
						option.allLine[i] = MacroLine.CreateLine(temp);
						option.allLine[i].orgText = line.orgText;
					} else {
						option.allLine[i].lineType = BaseLineType.OnlyLabel;
						let label = LabelUtils.CreateLabel(option.allLine[i].orgText, undefined, option.allLine[i].comment, option);
						if (label)
							label.labelDefined = LabelDefinedState.Label;

						option.allLine[i].GetToken = Compile.SetLineTokenFunc.bind(option.allLine[i]);
					}
					break;
				case BaseLineType.Command:
					await Commands.SecondAnalyse(option);
					break;
			}
			i = option.lineIndex;
		}
	}
	//#endregion 第二次分析，分析是自定义函数或标签

	//#region 第三次分析，分析各表达式是否正确
	static async ThirdAnalyse(option: CommonOption) {
		for (let i = 0; i < option.allLine.length; i++) {
			const line = option.allLine[i];
			if (line.errorLine)
				continue;

			option.lineIndex = i;
			switch (line.lineType) {
				case BaseLineType.Instruction:
					InstructionLine.ThirdAnalyse(option);
					break;
				case BaseLineType.Expression:
					ExpressionLine.ThirdAnalyse(option);
					break;
				case BaseLineType.Macro:
					MacroLine.ThirdAnalyse(option);
					break;
				case BaseLineType.Command:
					await Commands.ThirdAnalyse(option);
					break;
			}
			i = option.lineIndex;
		}
	}
	//#endregion 第三次分析，分析各表达式是否正确

	//#region 解析所有行获取结果
	static async CompileAndGetResult(option: CommonOption) {
		for (let i = 0; i < option.allLine.length; i++) {
			if (MyException.isError)
				break;

			const line = option.allLine[i];
			if (line.errorLine || line.isFinished)
				continue;

			option.lineIndex = i;
			switch (line.lineType) {
				case BaseLineType.Instruction:
					Compile.GetLineLabel(option);
					Platform.instructionAnalyser.InstructionCompile(option);
					break;
				case BaseLineType.Command:
					Compile.GetLineLabel(option);
					await Commands.CompileCommands(option);
					break;
				case BaseLineType.OnlyLabel:
					Compile.GetLineLabel(option);
					line.isFinished = true;
					break;
				case BaseLineType.Expression:
					const tempLine = <ExpressionLine>option.allLine[i];
					let result = LexerUtils.GetExpressionValue(tempLine.expParts, "getValue", option);
					if (result.success) {
						let label = LabelUtils.FindLabel(tempLine.label, option);
						label!.value = result.value;
						line.isFinished = true;
					}
					break;
				case BaseLineType.Macro:
					Compile.GetLineLabel(option);
					await MacroLine.CompileMacro(option);
					break;
			}

			i = option.lineIndex;
		}
	}

	private static GetLineLabel(option: CommonOption) {
		const line = <CommandLine | InstructionLine>option.allLine[option.lineIndex];
		let labelToken: Token | undefined;
		switch (line.lineType) {
			case BaseLineType.Command:
			case BaseLineType.Instruction:
			case BaseLineType.Macro:
				labelToken = line.label;
				break;
			case BaseLineType.OnlyLabel:
				labelToken = line.orgText;
				break;
		}
		if (!labelToken || labelToken.isNull)
			return;

		let label = LabelUtils.FindTemporaryLabel(labelToken);
		if (label) {
			let temp = label.lineNumbers.find(value => value.lineNumber == labelToken!.lineNumber);
			temp!.value = GlobalVar.env.originalAddress;
		} else {
			console.log(labelToken);
			label = LabelUtils.FindLabel(labelToken, option);
			label!.value = GlobalVar.env.originalAddress;
		}
	}
	//#endregion 解析所有行获取结果

	/***** 辅助方法 *****/

	//#region 所有解析后的行获取值
	static GetAllBaseLineResult(allBaseLine: IBaseLine[], result: number[]) {
		for (let i = 0; i < allBaseLine.length; i++) {
			const line = allBaseLine[i];
			if (line.lineType == BaseLineType.Macro) {
				const macroLine = <MacroLine>allBaseLine[i];
				Compile.GetAllBaseLineResult(macroLine.resultLines, result);
				continue;
			}

			// @ts-ignore
			let tempResult: number[] = line.result;
			if (line.isFinished && tempResult && tempResult.length != 0) {
				tempResult.forEach((value, index) => {
					// @ts-ignore
					result[line.baseAddress + index] = value;
				});
			}
		}
	}
	//#endregion 所有解析后的行获取值

	//#region 获取所有基础行的Buffer
	static GetAllBaseLineBytes(data: number[]): Uint8Array {
		let buffer = new Uint8Array(data.length);
		for (let i = 0; i < data.length; i++) {
			if (data[i] != undefined)
				buffer[i] = data[i];
		}
		return buffer;
	}
	//#endregion 获取所有基础行的Buffer

	//#region 获取编译的String
	static GetResultString(data: number[]) {
		let result = "";
		for (let i = 0; i < data.length; i++) {
			const d = data[i];
			if (d == undefined) {
				result += "00 ";
			} else {
				let temp = d.toString(16);
				temp = temp.toUpperCase();
				if (temp.length < 2)
					temp = "0" + temp;

				result += temp + " ";
			}
		}
		return result;
	}
	//#endregion 获取编译的String

	/***** 辅助选项 *****/

	private static SetLineTokenFunc(this: IBaseLine) {
		this.orgText.type = TokenType.Label;
		return [this.orgText];
	}
}