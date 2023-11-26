import { Commands } from "../Commands/Commands";
import { IMacroLine, MacroUtils } from "../Commands/Macro";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { ICommonLine, LineCompileType, LineType } from "../Lines/CommonLine";
import { InstructionLine, InstructionLineUtils } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { OnlyLabelLine } from "../Lines/OnlyLabelLine";
import { UnknowLine } from "../Lines/UnknowLine";
import { VariableLine, VariableLineUtils } from "../Lines/VariableLine";
import { Platform } from "../Platform/Platform";
import { Config } from "./Config";
import { Environment } from "./Environment";
import { ExpressionResult, ExpressionUtils } from "./ExpressionUtils";
import { LabelUtils } from "./Label";
import { MyDiagnostic } from "./MyException";
import { DecodeOption } from "./Options";
import { ResultUtils } from "./ResultUtils";
import { Token } from "./Token";

/**编译类 */
export class Compiler {

	static compiling: boolean = false;
	static compileTimes: number = 0
	static enviroment: Environment;
	static isLastCompile: boolean = false;
	private static compilerEnv = new Environment(true);
	private static editorEnv = new Environment(false);

	//#region 解析文本
	/**
	 * 解析文本
	 * @param files.text 文本
	 * @param files.filePath 文件路径
	 * @returns 
	 */
	static async DecodeText(files: { text: string, filePath: string }[]) {

		if (Compiler.compiling)
			return;

		Compiler.compiling = true;
		Compiler.enviroment = Compiler.editorEnv;
		let option = new DecodeOption([]);
		for (let index = 0; index < files.length; ++index) {

			let fileHash = Compiler.enviroment.SetFile(files[index].filePath);

			MyDiagnostic.ClearFileExceptions(fileHash);
			Compiler.enviroment.ClearFile(fileHash);

			let lines = Compiler.SplitTexts(fileHash, files[index].text);
			option.InsertLines(fileHash, option.allLines.length, lines);
		}

		await Compiler.FirstAnalyse(option);
		await Compiler.SecondAnalyse(option);
		await Compiler.ThirdAnalyse(option);
		Compiler.compiling = false;
	}
	//#endregion 解析文本

	//#region 编译所有文本
	/**
	 * 编译所有文本
	 * @param filePath 文件路径
	 * @param text 文本内容
	 */
	static async CompileText(filePath: string, text: string) {

		if (Compiler.compiling)
			return;

		Compiler.compiling = true;
		Compiler.enviroment = Compiler.compilerEnv;
		let option = new DecodeOption([]);

		let fileHash = Compiler.enviroment.SetFile(filePath);
		MyDiagnostic.ClearAll();
		Compiler.enviroment.ClearAll();

		let lines = Compiler.SplitTexts(fileHash, text);
		option.InsertLines(fileHash, 0, lines);

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

		if (MyDiagnostic.hasError)
			return;

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
			let labelToken = tokens[0].Substring(0, match!.index);
			let comOrIntrs = tokens[0].Substring(match!.index, match![0].length);
			let expression = tokens[0].Substring(match!.index + match![0].length);

			comOrIntrs.text = comOrIntrs.text.toUpperCase();

			switch (lineType) {
				case LineType.Command:
					let comLine = new CommandLine();
					comLine.Initialize({ command: comOrIntrs, expression, labelToken });
					newLine = comLine;
					break;
				case LineType.Instruction:
					let tempInsLine = new InstructionLine();
					tempInsLine.Initialize({ instruction: comOrIntrs, expression, labelToken });
					newLine = tempInsLine;
					break;
				case LineType.Variable:
					let varLine = new VariableLine();
					varLine.Initialize({ labelToken, expression });
					newLine = varLine;
					break;
			}

			if (!tokens[1].isEmpty)
				newLine.comment = tokens[1].text;
		}
		//#endregion 保存行Token

		let allLines = text.split(/\r\n|\r|\n/);
		let orgText;
		for (let index = 0; index < allLines.length; ++index) {
			orgText = Token.CreateToken(fileHash, index, 0, allLines[index]);

			const { content, comment } = Compiler.GetContent(orgText);
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
				newLine = new UnknowLine();
			}

			if (comment.text)
				newLine.comment = comment.text;

			newLine.orgText = content;
			result.push(newLine);
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
					InstructionLineUtils.FirstAnalyse(option);
					break;
				case LineType.Command:
					await Commands.FirstAnalyse(option);
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
					let unknowLine = option.GetCurrectLine<UnknowLine>();
					let match = new RegExp(Compiler.enviroment.macroRegexString).exec(unknowLine.orgText.text);
					let macroName = match?.groups?.["macro"];
					if (macroName) {
						let pre = unknowLine.orgText.Substring(0, match!.index);
						let currect = unknowLine.orgText.Substring(match!.index, match![0].length);
						let after = unknowLine.orgText.Substring(match!.index + match![0].length);
						MacroUtils.MatchMacroLine(pre, currect, after, option);
					} else {
						let onlyLabelLine = new OnlyLabelLine();
						onlyLabelLine.comment = unknowLine.comment;
						option.ReplaceLine(onlyLabelLine, unknowLine.orgText.fileHash);
						onlyLabelLine.Initialize(unknowLine.orgText, option);
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
					InstructionLineUtils.ThirdAnalyse(option);
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
			i = option.lineIndex;
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

			if (MyDiagnostic.hasError) {
				Compiler.compileTimes = Config.ProjectSetting.compileTimes;
				break;
			}

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Instruction:
					InstructionLineUtils.CompileInstruction(option);
					break;
				case LineType.Command:
					await Commands.CompileCommands(option);
					break;
				case LineType.OnlyLabel:
					const onlyLabelLine = option.GetCurrectLine<OnlyLabelLine>();
					let label1 = LabelUtils.GetLabelWithHash(onlyLabelLine.labelHash, option.macro);
					if (label1) {
						label1.value = Compiler.enviroment.orgAddress;
						delete (onlyLabelLine.labelHash);
					}
					onlyLabelLine.compileType = LineCompileType.Finished;
					break;
				case LineType.Variable:
					const varLine = option.GetCurrectLine<VariableLine>();
					let label2 = LabelUtils.FindLabel(varLine.labelToken, option.macro);
					let result = ExpressionUtils.GetExpressionValue(varLine.exprParts, isFinal, option);
					if (label2 && result.success) {
						label2.value = result.value;
						varLine.compileType = LineCompileType.Finished;
						delete (varLine.labelToken);
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
	static SetResult(line: InstructionLine | CommandLine | IMacroLine, value: number, index: number, length: number): number {
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
			value >>>= 8;
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
	static SetAddress(line: InstructionLine | CommandLine | MacroLine) {
		if (Compiler.enviroment.orgAddress < 0) {
			line.compileType = LineCompileType.Error;
			let errorMsg = Localization.GetMessage("Unknow original address");
			let token!: Token;
			switch (line.type) {
				case LineType.Instruction:
					token = (line as InstructionLine).instruction;
					break;
				case LineType.Command:
					token = (line as CommandLine).command;
					break;
				case LineType.Macro:
					token = (line as MacroLine).macroToken;
					break;
			}

			MyDiagnostic.PushException(token, errorMsg);
		}

		if (line.orgAddress < 0) {
			line.baseAddress = Compiler.enviroment.baseAddress;
			line.orgAddress = Compiler.enviroment.orgAddress;
		}

		if (Compiler.enviroment.fileRange.start < 0) {
			Compiler.enviroment.fileRange.start = Compiler.enviroment.fileRange.end = Compiler.enviroment.baseAddress;
			return;
		}

		if (Compiler.enviroment.fileRange.start > Compiler.enviroment.baseAddress)
			Compiler.enviroment.fileRange.start = Compiler.enviroment.baseAddress;
	}
	//#endregion 设定起始地址

	//#region 给文件的地址增加偏移
	static AddAddress(line: InstructionLine | CommandLine | MacroLine) {
		if (line.orgAddress >= 0) {
			Compiler.enviroment.orgAddress = line.orgAddress;
			Compiler.enviroment.baseAddress = line.baseAddress;
		}

		Compiler.enviroment.baseAddress += line.result.length;
		Compiler.enviroment.orgAddress += line.result.length;

		if (Compiler.enviroment.fileRange.end < Compiler.enviroment.baseAddress) {
			Compiler.enviroment.fileRange.end = Compiler.enviroment.baseAddress;
			// console.log(Compiler.enviroment.fileRange.end);
		}
	}
	//#endregion 给文件的地址增加偏移

}

