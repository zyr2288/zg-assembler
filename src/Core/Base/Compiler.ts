import { Environment } from "./Environment";
import { DecodeOption } from "./Options";
import { IInstructionLine, InstructionLine } from "../Lines/InstructionLine";
import { ICommonLine, IUnknowLine, LineCompileType, LineType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "../Commands/Commands";
import { MacroUtils } from "../Commands/Macro";
import { LabelType, LabelUtils } from "./Label";
import { Token } from "./Token";
import { IVariableLine, VariableLineUtils } from "../Lines/VariableLine";
import { Platform } from "../Platform/Platform";
import { MyException } from "./MyException";

export interface SplitLine {
	label: Token;
	comOrIntrs: Token;
	expression: Token;
}


export class Compiler {

	private static compilerEnv = new Environment();
	private static editorEnv = new Environment();

	static enviroment: Environment;

	//#region 解析文本
	static async DecodeText(files: { text: string, filePath: string }[]) {

		Compiler.enviroment = Compiler.editorEnv;

		let option: DecodeOption = { allLines: [], lineIndex: 0, };
		for (let index = 0; index < files.length; ++index) {

			let fileHash = Compiler.enviroment.SetFile(files[index].filePath);

			Compiler.ClearFile(fileHash);

			Compiler.enviroment.ClearFile(fileHash);
			let lines = Compiler.SplitTexts(fileHash, files[index].text);

			Compiler.enviroment.allBaseLines.set(fileHash, lines);
			option.allLines.push(...lines);
		}

		await Compiler.FirstAnalyse(option);
		await Compiler.SecondAnalyse(option);
		await Compiler.ThirdAnalyse(option);
	}
	//#endregion 解析文本

	//#region 第一次分析
	/**第一次分析 */
	static async FirstAnalyse(option: DecodeOption) {

		for (let i = 0; i < option.allLines.length; ++i) {
			const line = option.allLines[i];

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Instruction:
					InstructionLine.FirstAnalyse(option);
					break;
				case LineType.Command:
					Commands.FirstAnalyse(option);
					break;
				case LineType.Variable:
					VariableLineUtils.FirstAnalyse(option);
					break;
			}

			i = option.lineIndex;
		}

	}
	//#endregion 第一次分析

	//#region 第二次分析
	static async SecondAnalyse(option: DecodeOption) {
		for (let i = 0; i < option.allLines.length; i++) {
			let line = option.allLines[i];
			if (line.compileType === LineCompileType.Error)
				continue;

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Unknow:
					let match = new RegExp(Compiler.enviroment.macroRegexString).exec(line.orgText.text);
					let macroName = match?.groups?.["macro"];
					if (macroName) {
						let pre = line.orgText.Substring(0, match!.index);
						let currect = line.orgText.Substring(match!.index, match![0].length);
						let after = line.orgText.Substring(match!.index + match![0].length);
						MacroUtils.MatchMacroLine(pre, currect, after, option);
					} else {
						option.allLines[i].type = LineType.OnlyLabel;
						let label = LabelUtils.CreateLabel(option.allLines[i].orgText, option);
						if (label)
							label.labelType = LabelType.Label;
					}
					break;
				case LineType.Command:
					await Commands.SecondAnalyse(option);
					break;
			}
			i = option.lineIndex;
		}
	}
	//#endregion 第二次分析

	//#region 第三次分析
	static async ThirdAnalyse(option: DecodeOption) {
		for (let i = 0; i < option.allLines.length; ++i) {
			const line = option.allLines[i];
			if (line.compileType === LineCompileType.Error)
				continue;

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Instruction:
					InstructionLine.ThirdAnalyse(option);
					break;
				case LineType.Command:
					Commands.ThirdAnalyse(option);
					break;
				case LineType.Variable:
					VariableLineUtils.ThirdAnalyse(option);
					break;
				case LineType.Macro:
					break;
			}
		}
	}
	//#endregion 第三次分析

	//#region 分解文本
	/**分解文本 */
	private static SplitTexts(fileHash: number, text: string): ICommonLine[] {
		let match: RegExpExecArray | null = null;
		let tokens: Token[];
		let newLine = {} as ICommonLine;
		let result: ICommonLine[] = [];

		//#region 保存行Token
		const SaveToken = (lineType: LineType) => {

			let splitLine: SplitLine = {
				label: tokens[0].Substring(0, match!.index),
				comOrIntrs: tokens[0].Substring(match!.index, match![0].length),
				expression: tokens[0].Substring(match!.index + match![0].length),
			};

			switch (lineType) {
				case LineType.Command:
					newLine = { type: LineType.Command, result: [] as number[] } as ICommandLine;
					break;
				case LineType.Instruction:
					newLine = { type: LineType.Instruction, result: [] as number[] } as IInstructionLine;
					break;
				case LineType.Variable:
					newLine = { type: LineType.Variable } as IVariableLine;
					break;
			}

			// @ts-ignore
			newLine.splitLine = splitLine;
			newLine.compileType = LineCompileType.None;

			if (!tokens[1].isEmpty)
				result[result.length - 1].comment = tokens[1].text;
		}
		//#endregion 保存行Token

		let allLines = text.split(/\r\n|\r|\n/);
		for (let index = 0; index < allLines.length; ++index) {
			newLine.orgText = Token.CreateToken(fileHash, index, 0, allLines[index]);

			tokens = Compiler.GetContent(newLine.orgText);
			if (tokens[0].isEmpty)
				continue;

			let regex = new RegExp(Platform.regexString, "i");
			match = regex.exec(tokens[0].text);

			if (match?.groups?.["command"]) {
				SaveToken(LineType.Command);
			} else if (match?.groups?.["instruction"]) {
				SaveToken(LineType.Instruction);
			} else if (match?.groups?.["variable"]) {
				SaveToken(LineType.Variable);
			} else {
				newLine = {
					type: LineType.Unknow,
					orgText: tokens[0],
					comment: tokens[1].text,
					compileType: LineCompileType.None
				} as IUnknowLine;
			}

			result.push(newLine);
			newLine = {} as ICommonLine;
		}
		return result;
	}
	//#endregion 分解文本

	//#region 分割内容与注释
	/**分割内容与注释 */
	private static GetContent(token: Token) {
		return token.Split(/;[+-]?/, { count: 1 });
	}
	//#endregion 分割内容与注释

	/***** Private *****/

	//#region 清除文件
	private static ClearFile(fileHash:number) {
		MyException.ClearFileExceptions(fileHash);
		Compiler.enviroment.ClearFile(fileHash);
	}
	//#endregion 清除文件

}