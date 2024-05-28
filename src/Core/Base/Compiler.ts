import { Commands } from "../Commands/Commands";
import { MacroUtils } from "../Commands/Macro";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { CommonLine, ICommonLine, LineCompileType, LineType } from "../Lines/CommonLine";
import { InstructionLine, InstructionLineUtils } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { OnlyLabelLine } from "../Lines/OnlyLabelLine";
import { UnknowLine } from "../Lines/UnknowLine";
import { VariableLine, VariableLineUtils } from "../Lines/VariableLine";
import { Platform } from "../Platform/Platform";
import { Config } from "./Config";
import { Environment } from "./Environment";
import { ExpressionUtils } from "./ExpressionUtils";
import { LabelNormal } from "./Label";
import { MyDiagnostic } from "./MyException";
import { DecodeOption } from "./Options";
import { ResultUtils } from "./ResultUtils";
import { Token } from "./Token";

type MatchKey = "instruction" | "command" | "comment" | "variable" | "macro" | "unknow";

interface MatchResult {
	key: MatchKey;
	content: {
		pre: Token,
		main: Token,
		rest: Token,
	},
	comment: string
}

/**编译类 */
export class Compiler {

	static compiling: boolean = false;
	static compileTimes: number = 0
	static enviroment: Environment;
	static isLastCompile: boolean = false;
	private static compilerEnv = new Environment(true);
	private static editorEnv = new Environment(false);
	private static tempComment = { lastComment: "", saveComment: [] as string[] };

	private static comma = new Set<string>(",");
	private static space = new Set<string>([" ", "\t"]);
	private static equal = new Set<string>("=");

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
			Compiler.compileTimes++;
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
	static SplitTexts(fileHash: number, text: string): CommonLine[] {
		const result: CommonLine[] = [];

		let newLine = {} as CommonLine;
		let match!: MatchResult;
		let orgText: Token;

		//#region 保存行Token
		const SaveToken = (lineType: LineType) => {

			const labelToken = match.content.pre;
			const comOrIntrs = match.content.main;
			const expToken = match.content.rest;

			comOrIntrs.text = comOrIntrs.text.toUpperCase();

			switch (lineType) {
				case LineType.Command:
					const comLine = new CommandLine();
					comLine.Initialize({ command: match.content.main, expression: expToken });
					Compiler.GetOnlyLabel(labelToken, result);
					newLine = comLine;
					break;
				case LineType.Instruction:
					const tempInsLine = new InstructionLine();
					tempInsLine.Initialize({ instruction: comOrIntrs, expression: expToken });
					Compiler.GetOnlyLabel(labelToken, result);
					newLine = tempInsLine;
					break;
				case LineType.Variable:
					const varLine = new VariableLine();
					varLine.Initialize({ expression: expToken, labelToken });
					newLine = varLine;
					break;
			}

			// if (!tokens[1].isEmpty)
			// 	newLine.comment = tokens[1].text;
		}
		//#endregion 保存行Token

		const allLines = text.split(/\r\n|\r|\n/);
		for (let lineIndex = 0; lineIndex < allLines.length; ++lineIndex) {
			orgText = Token.CreateToken(allLines[lineIndex], { fileHash, line: lineIndex });

			const { content, comment } = Compiler.GetContent(orgText);
			Compiler.CommentAdd(content.isEmpty, comment?.text);
			if (content.isEmpty)
				continue;

			match = Compiler.MatchLineCommon(content.text);
			match.content.pre.fileHash = match.content.main.fileHash = match.content.rest.fileHash = fileHash;
			match.content.pre.line = match.content.main.line = match.content.rest.line = lineIndex;
			match.content.pre.start += content.start;
			match.content.main.start += content.start;
			match.content.rest.start += content.start;

			switch (match.key) {
				case "instruction":
					SaveToken(LineType.Instruction);
					break;
				case "command":
					SaveToken(LineType.Command);
					break;
				case "variable":
					SaveToken(LineType.Variable);
					break;
				case "unknow":
					newLine = new UnknowLine();
					break;
			}


			// if (match.key) {
			// 	SaveToken(LineType.Command);
			// } else if (match?.groups?.["instruction"]) {
			// 	SaveToken(LineType.Instruction);
			// } else if (match?.groups?.["variable"]) {
			// 	SaveToken(LineType.Variable);
			// } else {
			// 	newLine = new UnknowLine();
			// }

			Compiler.CommentClear();
			if (Compiler.tempComment.lastComment) {
				newLine.comment = Compiler.tempComment.lastComment;
			}

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
				case LineType.OnlyLabel:
					const olLine = line as OnlyLabelLine;
					olLine.Analyse(option);
					break;
			}

			i = option.lineIndex;
		}

	}
	//#endregion 第一次分析

	//#region 第二次分析
	static async SecondAnalyse(option: DecodeOption) {
		for (let i = 0; i < option.allLines.length; i++) {
			const line = option.allLines[i];
			if (line.compileType === LineCompileType.Error || line.compileType === LineCompileType.Finished)
				continue;

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Unknow:
					const unknowLine = option.GetCurrectLine<UnknowLine>();
					const match = Compiler.MatchLine(unknowLine.orgText.text, ["macro", Compiler.enviroment.allMacro]);
					if (match.key === "macro") {
						const line = Compiler.GetOnlyLabel(match.content.pre, option.allLines, option.lineIndex);
						if (line) {
							line.Analyse(option);
							option.lineIndex++;
						}
						MacroUtils.MatchMacroLine(match.content.main, match.content.rest, option);
					} else {
						const onlyLabelLine = new OnlyLabelLine();
						onlyLabelLine.comment = unknowLine.comment;
						onlyLabelLine.orgText = line.orgText;
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
	private static GetContent(token: Token) {
		const temp = token.Split(/;[+-]?/, { count: 1 });
		let comment: Token | undefined = temp[1];
		if (token.text.indexOf(";") < 0)
			comment = undefined;

		return { content: temp[0], comment };
	}
	//#endregion 分割内容与注

	//#region 匹配通用行
	static MatchLineCommon(lineText: string) {
		const tempMatch = Compiler.MatchLine(lineText, ["instruction", Platform.allInstruction], ["command", Commands.commandNames]);
		if (tempMatch.key === "unknow") {
			return Compiler.MatchLine(lineText, ["variable", Compiler.equal]);
		}

		return tempMatch;
	}
	//#endregion 匹配通用行

	//#region 基础分析行
	/**
	 * 基础分析行，只分析 Command Instruction
	 * @param lineText 一行内容
	 * @returns 基础分析内容，Command 和 Instruction
	 */
	static MatchLine(lineText: string, ...matchContent: [key: string, value: Set<string> | Map<string, any>][]) {
		const result: MatchResult = {
			key: "unknow" as MatchKey,
			content: {
				pre: {} as Token,
				main: {} as Token,
				rest: {} as Token,
			},
			comment: ""
		};

		if (lineText.trim() === "") {
			return result;
		}

		// 如果包含注释，则移除注释
		let index = lineText.indexOf(";");
		if (index !== -1) {
			result.comment = lineText.substring(index + 1);
			if (result.comment[0] === "+" || result.comment[0] === "-")
				result.comment = result.comment.substring(1);

			lineText = lineText.substring(0, index);
			if (lineText.trim() === "") {
				result.key = "comment";
				return result;
			}
		}

		let times = 0;
		index = 0;
		while (true) {
			const tempResult = Compiler.SplitWithChar(index, lineText, Compiler.space);
			if (times > 1 || tempResult.text === "")
				break;

			const upCaseMatch = tempResult.text.toUpperCase();

			for (let i = 0; i < matchContent.length; i++) {
				const content = matchContent[i];
				if (content[1].has(upCaseMatch)) {
					result.key = content[0] as MatchKey;
					break;
				}
			}

			if (result.key === "unknow") {
				index = tempResult.start + tempResult.text.length + 1;
				times++;
				continue;
			}

			result.content.main = Token.CreateToken(tempResult.text, { start: tempResult.start });

			const tempStr = lineText.substring(0, tempResult.start - 1);
			result.content.pre = Token.CreateToken(tempStr);

			const length = tempResult.start + tempResult.text.length;
			result.content.rest = Token.CreateToken(lineText.substring(length), { start: length });

			return result;
		}
		result.key = "unknow";
		result.content.main = Token.CreateToken(lineText);
		return result;
	}
	//#endregion 基础分析行

	//#region 分割逗号
	/**
	 * 
	 * @param token 要分割的Token
	 * @param option.count 分割几次，0是无数次
	 * @returns 
	 */
	static SplitComma(token: Token | undefined, option?: { count?: number }) {
		if (!token || token.isEmpty)
			return;

		let result: Token[] = [];
		let count = option?.count ?? 0;
		let start = 0;
		while (true) {
			let temp = Compiler.SplitWithChar(start, token.text, Compiler.comma);
			if (temp.text === "")
				break;

			const newToken = Token.CreateToken(temp.text, { start: start + token.start, line: token.line, fileHash: token.fileHash });
			result.push(newToken);
			start += temp.text.length + 1;

			if (--count === 0) {
				let temp2 = token.Substring(start + 1);
				if (!temp2.isEmpty)
					result.push(temp2);

				break;
			}

		}

		return result;
	}
	//#endregion 分割逗号

	/***** 编译结果 *****/

	//#region 编译结果
	/**
	 * 编译结果
	 * @param option 
	 */
	static async CompileResult(option: DecodeOption) {
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
					if (onlyLabelLine.saveLabel) {
						onlyLabelLine.saveLabel.label.value = Compiler.enviroment.orgAddress;
						onlyLabelLine.saveLabel.notFinish = false;
					}
					onlyLabelLine.compileType = LineCompileType.Finished;
					break;
				case LineType.Variable:
					const varLine = option.GetCurrectLine<VariableLine>();
					// const result = ExpressionUtils.GetExpressionValue<number>(varLine.expParts[0], option);
					// if (!varLine.saveLabel)
					// 	break;

					// if (!varLine.saveLabel.notFinish || (varLine.saveLabel.label && result.success)) {
					// 	varLine.saveLabel.label.value = result.value;
					// 	varLine.compileType = LineCompileType.Finished;
					// 	varLine.saveLabel.notFinish = true;
					// }
					break;
				case LineType.Macro:
					await MacroUtils.CompileMacroLine(option);
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
	static SetResult(line: InstructionLine | CommandLine | MacroLine, value: number, index: number, length: number): number {
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

	/***** 辅助方法 *****/

	//#region 分割基础行，不在字符串内分析
	/**
	 * 分割基础行，不在字符串内分析
	 * @param start 起始分析位置
	 * @param lineText 行内容
	 * @param chars 所有要分析的字符
	 * @returns 
	 */
	private static SplitWithChar(start: number, lineText: string, chars: Set<string>) {
		let matchStart = start;
		let matchText = "";
		let isString = false;

		for (let index = start; index < lineText.length; index++) {
			if (isString) {
				if (lineText[index] !== "\"")
					continue;

				if (lineText[index - 1] !== "\\")
					isString = false;

				continue;
			}

			if (lineText[index] === "\"") {
				isString = true;
				continue;
			} else if (chars.has(lineText[index])) {
				matchText = lineText.substring(matchStart, index);
				if (matchText.trim() === "") {
					matchStart++;
					continue;
				}

				break;
			}
		}

		if (matchText === "")
			matchText = lineText.substring(matchStart);

		return { start: matchStart, text: matchText };
	}
	//#endregion 分割基础行，不在字符串内分析

	//#region 提取行前的Label单独转换城OnlyLabelLine
	/**
	 * 提取行前的Label单独转换城OnlyLabelLine
	 * @param token Label的Token
	 * @param lines 所有行
	 * @param index 插入的位置，若为undefined则放入最后
	 * @returns 创建的新行
	 */
	private static GetOnlyLabel(token: Token, lines: ICommonLine[], index?: number) {
		if (token.isEmpty)
			return;

		const line = new OnlyLabelLine();
		line.orgText = token;
		line.saveLabel = { token, label: {} as LabelNormal, notFinish: true };
		if (index !== undefined)
			lines.splice(index, 0, line);
		else
			lines.push(line);

		return line;
	}
	//#endregion 提取行前的Label单独转换城OnlyLabelLine

	//#region 添加注释
	/**
	 * 添加注释
	 * @param comment 注释
	 * @param save 是否保存
	 */
	private static CommentAdd(save: boolean, comment?: string) {
		if (save && comment === undefined)
			Compiler.tempComment.saveComment = [];

		if (comment !== undefined)
			Compiler.tempComment.saveComment.push(comment.trim());
	}
	//#endregion 添加注释

	//#region 清除注释
	private static CommentClear() {
		Compiler.tempComment.lastComment = Compiler.tempComment.saveComment.join("\n");
		Compiler.tempComment.saveComment = [];
	}
	//#endregion 清除注释

}

