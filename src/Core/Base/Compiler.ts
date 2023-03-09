import { Commands, ICommandLine } from "../Commands/Commands";
import { IMacroLine, MacroUtils } from "../Commands/Macro";
import { Localization } from "../I18n/Localization";
import { HighlightType, ICommonLine, IOnlyLabel, LineCompileType, LineType, SplitLine } from "../Lines/CommonLine";
import { IInstructionLine, InstructionLine } from "../Lines/InstructionLine";
import { IVariableLine, VariableLineUtils } from "../Lines/VariableLine";
import { Platform } from "../Platform/Platform";
import { Config } from "./Config";
import { Environment } from "./Environment";
import { ExpressionResult, ExpressionUtils } from "./ExpressionUtils";
import { LabelType, LabelUtils } from "./Label";
import { MyDiagnostic } from "./MyException";
import { CommandDecodeOption, DecodeOption } from "./Options";
import { ResultUtils } from "./ResultUtils";
import { Token } from "./Token";

export class Compiler {

	static compiling: boolean = false;
	static compileTimes: number = 0
	static enviroment: Environment;
	static isLastCompile: boolean = false;
	private static compilerEnv = new Environment(true);
	private static editorEnv = new Environment(false);

	//#region 解析文本
	static async DecodeText(files: { text: string, filePath: string }[]) {

		if (Compiler.compiling)
			return;

		Compiler.compiling = true;
		Compiler.enviroment = Compiler.editorEnv;
		let option: DecodeOption = { allLines: [], lineIndex: 0 };
		for (let index = 0; index < files.length; ++index) {

			let fileHash = Compiler.enviroment.SetFile(files[index].filePath);

			MyDiagnostic.ClearFileExceptions(fileHash);
			Compiler.enviroment.ClearFile(fileHash);

			let lines = Compiler.SplitTexts(fileHash, files[index].text);

			option.allLines.push(...lines);
		}

		await Compiler.FirstAnalyse(option);
		await Compiler.SecondAnalyse(option);
		await Compiler.ThirdAnalyse(option);
		Compiler.compiling = false;
	}
	//#endregion 解析文本

	//#region 编译所有文本
	/**
	 * 
	 * @param filePath 
	 * @param text 
	 */
	static async CompileText(filePath: string, text: string) {

		if (Compiler.compiling)
			return;

		Compiler.compiling = true;
		Compiler.enviroment = Compiler.compilerEnv;
		let option: DecodeOption = { allLines: [], lineIndex: 0 };

		let fileHash = Compiler.enviroment.SetFile(filePath);
		MyDiagnostic.ClearAll();
		Compiler.enviroment.ClearAll();

		let lines = Compiler.SplitTexts(fileHash, text);
		option.allLines.push(...lines);

		await Compiler.FirstAnalyse(option);
		await Compiler.SecondAnalyse(option);
		await Compiler.ThirdAnalyse(option);

		Compiler.isLastCompile = false;
		Compiler.compileTimes = 0;
		while (Compiler.compileTimes < Config.ProjectSetting.compileTimes) {
			if (Compiler.compileTimes === Config.ProjectSetting.compileTimes - 1)
				Compiler.isLastCompile = true;

			await Compiler.CompileResult(option);
			++Compiler.compileTimes;
		}
		Compiler.compiling = false;

		return ResultUtils.GetResult(option.allLines);
	}
	//#endregion 编译所有文本

	/***** 分割与分析 *****/

	//#region 分解文本
	/**分解文本 */
	static SplitTexts(fileHash: number, text: string): ICommonLine[] {
		let match: RegExpExecArray | null = null;
		let tokens: Token[] = [];
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
					newLine = { type: LineType.Command } as ICommandLine;
					Compiler.LineInitialize(newLine as ICommandLine);
					break;
				case LineType.Instruction:
					newLine = { type: LineType.Instruction } as IInstructionLine;
					Compiler.LineInitialize(newLine as IInstructionLine);
					break;
				case LineType.Variable:
					newLine = { type: LineType.Variable } as IVariableLine;
					break;
			}

			// @ts-ignore
			newLine.splitLine = splitLine;
			newLine.compileType = LineCompileType.None;

			if (!tokens[1].isEmpty)
				newLine.comment = tokens[1].text;


		}
		//#endregion 保存行Token

		let allLines = text.split(/\r\n|\r|\n/);
		for (let index = 0; index < allLines.length; ++index) {
			newLine.orgText = Token.CreateToken(fileHash, index, 0, allLines[index]);

			const { content, comment } = Compiler.GetContent(newLine.orgText);
			tokens = [content, comment];
			if (content.isEmpty)
				continue;

			match = new RegExp(Platform.regexString, "ig").exec(content.text);

			if (match?.groups?.["command"]) {
				SaveToken(LineType.Command);
			} else if (match?.groups?.["instruction"]) {
				SaveToken(LineType.Instruction);
			} else if (match?.groups?.["variable"]) {
				SaveToken(LineType.Variable);
			} else {
				newLine = {
					type: LineType.Unknow,
					comment: comment.text,
					compileType: LineCompileType.None
				} as ICommonLine;
			}

			newLine.orgText = content;
			result.push(newLine);

			let lines = Compiler.enviroment.allBaseLines.get(fileHash);
			if (!lines) {
				lines = new Map();
				Compiler.enviroment.allBaseLines.set(fileHash, lines);
			}

			lines.set(index, newLine);
			newLine = {} as ICommonLine;
		}
		return result;
	}
	//#endregion 分解文本

	//#region 第一次分析
	/**第一次分析 */
	static async FirstAnalyse(option: DecodeOption) {

		for (let i = 0; i < option.allLines.length; ++i) {
			const line = option.allLines[i];
			if (line.compileType == LineCompileType.Error || line.compileType === LineCompileType.Finished)
				continue;

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Instruction:
					InstructionLine.FirstAnalyse(option);
					break;
				case LineType.Command:
					Commands.FirstAnalyse(option as CommandDecodeOption);
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
			if (line.compileType === LineCompileType.Error || line.compileType === LineCompileType.Finished)
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
						Compiler.LineInitialize(option.allLines[i] as IMacroLine);
					} else {
						option.allLines[i].type = LineType.OnlyLabel;
						let label = LabelUtils.CreateLabel(option.allLines[i].orgText, option);
						if (label) {
							label.labelType = LabelType.Label;
							(option.allLines[i] as IOnlyLabel).label = label;
							option.allLines[i].GetTokens = () => [{ token: label!.token, type: HighlightType.Label }];
						}
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
			if (line.compileType === LineCompileType.Error || line.compileType === LineCompileType.Finished)
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
					Commands.ThirdAnalyse_Common(option);
					break;
			}
		}
	}
	//#endregion 第三次分析

	//#region 分割内容与注释
	/**分割内容与注释 */
	static GetContent(token: Token) {
		let temp = token.Split(/;[+-]?/, { count: 1 });
		return { content: temp[0], comment: temp[1] };
	}
	//#endregion 分割内容与注

	/***** 编译结果 *****/

	//#region 编译结果
	/**
	 * 编译结果
	 * @param option 
	 */
	static async CompileResult(option: DecodeOption) {
		let isFinal = Compiler.isLastCompile ? ExpressionResult.GetResultAndShowError : ExpressionResult.TryToGetResult;
		for (let i = 0; i < option.allLines.length; ++i) {
			const line = option.allLines[i];
			if (line.compileType === LineCompileType.Finished)
				continue;

			if (line.compileType === LineCompileType.Error) {
				Compiler.compileTimes = Config.ProjectSetting.compileTimes;
				break;
			}

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Instruction:
					InstructionLine.CompileInstruction(option);
					break;
				case LineType.Command:
					await Commands.CompileCommands(option);
					break;
				case LineType.OnlyLabel:
					const onlyLabelLine = option.allLines[i] as IOnlyLabel;
					onlyLabelLine.label.value = Compiler.enviroment.orgAddress;
					onlyLabelLine.compileType = LineCompileType.Finished;
					break;
				case LineType.Variable:
					const varLine = option.allLines[i] as IVariableLine;
					let result = ExpressionUtils.GetExpressionValue(varLine.exprParts, isFinal, option);
					if (result.success) {
						varLine.label.value = result.value;
						varLine.compileType = LineCompileType.Finished;
					}
					break;
				case LineType.Macro:
					MacroUtils.CompileMacroLine(option);
					break;
			}
			i = option.lineIndex;
		}
	}
	//#endregion 编译结果

	//#region 行设定结果值
	/**
	 * 行设定结果值
	 * @param line 当前行
	 * @param value 设定值
	 * @param index 设定的起始位置
	 * @param length 设定长度
	 * @returns 返回设定的值
	 */
	static SetResult(line: IInstructionLine | ICommandLine | IMacroLine, value: number, index: number, length: number) {
		line.result ??= [];

		let temp = length;
		let tempIndex = 0;

		while (temp--) {
			line.result[index + tempIndex] = 0;
			tempIndex++;
		}

		let setResult = 0;
		let offset = 0;
		while (length--) {
			line.result[index] = value & 0xFF;
			setResult |= line.result[index] << offset;
			value >>= 8;
			offset += 8;
			index++;
		}

		return setResult;
	}
	//#endregion 行设定结果值

	//#region 设定起始地址
	/**
	 * 设定起始地址
	 * @param line 当前行
	 * @returns true为正确
	 */
	static SetAddress(line: IInstructionLine | ICommandLine | IMacroLine) {
		if (Compiler.enviroment.orgAddress < 0) {
			let errorMsg = Localization.GetMessage("Unknow original address");
			MyDiagnostic.PushException(line.orgText, errorMsg);
			return false;
		}

		if (line.orgAddress < 0) {
			line.baseAddress = Compiler.enviroment.baseAddress;
			line.orgAddress = Compiler.enviroment.orgAddress;
		}
		return true;
	}
	//#endregion 设定起始地址

	//#region 给文件的地址增加偏移
	static AddAddress(line: IInstructionLine | ICommandLine | IMacroLine) {
		if (line.orgAddress >= 0) {
			Compiler.enviroment.orgAddress = line.orgAddress;
			Compiler.enviroment.baseAddress = line.baseAddress;
		}

		Compiler.enviroment.baseAddress += line.result.length;
		Compiler.enviroment.orgAddress += line.result.length;
	}
	//#endregion 给文件的地址增加偏移

	/***** Private *****/

	//#region 绑定行命令
	/**
	 * 绑定行命令
	 * @param line 
	 */
	private static LineInitialize = (line: IInstructionLine | ICommandLine | IMacroLine) => {
		line.orgAddress = -1;
		line.baseAddress = 0;
		line.result ??= [];
	}
	//#endregion 绑定行命令

}

