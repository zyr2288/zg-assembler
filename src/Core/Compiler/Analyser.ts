import { Platform } from "../Platform/Platform";
import { Token } from "../Base/Token";
import { Command } from "../Command/Command";
import { Compiler } from "./Compiler";
import { InstructionLine } from "../Lines/InstructionLine";
import { CommonLine, LineType, UnknowLine } from "../Lines/CommonLine";
import { CommandLine } from "../Lines/CommandLine";
import { LabelLine } from "../Lines/LabelLine";
import { VariableLine } from "../Lines/VariableLine";
import { CompileOption } from "../Base/CompileOption";
import { MacroLine } from "../Lines/MacroLine";
import { Config } from "../Base/Config";

type MatchKey = "unknow" | "instruction" | "command" | "variable" | "macro";

interface MatchResult {
	key: MatchKey;
	org: Token;
	content?: {
		pre: Token;
		main: Token;
		rest: Token;
	}
}

export class Analyser {

	private static space = new Set<string>([" ", "\t"]);
	private static comma = new Set<string>(",");
	private static equal = new Set<string>("=");

	//#region 解析文本
	/**
	 * 解析所有文本
	 * @param text 文本
	 */
	static AnalyseText(text: string, filePath: string) {

		let org, line, match;
		const result: CommonLine[] = [];

		const lines = text.split(/\r?\n/g);

		const fileIndex = Compiler.enviroment.fileIndex

		let comment: string | undefined = undefined;
		let createLine: CommonLine | undefined;
		for (let i = 0; i < lines.length; i++) {
			org = new Token(lines[i], { line: i });
			line = Analyser.GetContent(org);
			match = Analyser.MatchLineCommon(line.content);

			if (line.comment === undefined) {
				if (line.content.isEmpty)
					comment = undefined;
			} else if (comment === undefined) {
				comment = line.comment;
			} else {
				comment += "\n" + line.comment;
			}

			if (line.content.isEmpty) {
				continue;
			}

			switch (match.key) {
				case "instruction":
					createLine = InstructionLine.Create(line.content, match.content!, comment);
					break;
				case "command":
					createLine = CommandLine.Create(line.content, match.content!, comment);
					break;
				case "variable":
					createLine = VariableLine.Create(line.content, match.content!, comment);
					break;
				case "unknow":
					createLine = UnknowLine.Create(line.content, comment);
					break;
			}

			if (createLine) {
				result[i] = createLine;
				comment = undefined;
			}
		}

		Compiler.enviroment.allLine.set(fileIndex, result);
		return result;
	}
	//#endregion 解析文本

	//#region 匹配通用行
	/**
	 * 匹配通用行
	 * @param lineText 一行Token
	 * @returns 匹配模式
	 */
	static MatchLineCommon(lineText: Token) {
		let match = Analyser.MatchLine(lineText, true, ["instruction", Platform.instructions], ["command", Command.commandParam]);
		if (match.key === "unknow") {
			const temp = Analyser.SplitWithChar(lineText.start, lineText.text, Analyser.equal);
			if (temp.text.length !== lineText.text.length) {
				match.key = "variable";
				match.org = lineText;
				match.content = {
					pre: new Token(temp.text, { start: temp.start, line: lineText.line }),
					main: lineText.Substring(temp.text.length, 1),
					rest: lineText.Substring(temp.text.length + 1)
				}
				match.content.pre = match.content.pre.Trim();
			}
		}
		return match;
	}
	//#endregion 匹配通用行

	//#region 基础分析行
	/**
	 * 基础分析行，只分析 Command Instruction
	 * @param lineText 一行内容，不包括注释
	 * @returns 基础分析内容，Command 和 Instruction
	 */
	static MatchLine(lineText: Token, upCase: boolean, ...matchContent: [key: Omit<MatchKey, "unknow">, value: Set<string> | Map<string, any>][]) {
		const result: MatchResult = {
			key: "unknow",
			org: lineText,
		};

		if (lineText.isEmpty) {
			return result;
		}

		let times = 0;
		let index = 0;
		while (true) {
			const tempResult = Analyser.SplitWithChar(index, lineText.text, Analyser.space);
			if (times > 1 || tempResult.text === "")
				break;

			const upCaseMatch = upCase ? tempResult.text.toUpperCase() : tempResult.text;
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

			result.content = {} as any;

			result.content!.main = new Token(tempResult.text, { start: tempResult.start + lineText.start, line: lineText.line });

			result.content!.pre = lineText.Substring(0, tempResult.start - 1);

			const length = tempResult.start + tempResult.text.length;
			result.content!.rest = lineText.Substring(length).Trim();

			return result;
		}

		return result;
	}
	//#endregion 基础分析行

	//#region 用逗号分割
	/**
	 * 用逗号分割
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
			let temp = Analyser.SplitWithChar(start, token.text, Analyser.comma);
			if (temp.text === "")
				break;

			result.push(new Token(temp.text, { start: start + token.start, line: token.line }));
			start += temp.text.length + 1;

			if (--count === 0) {
				let temp2 = token.Substring(start);
				if (!temp2.isEmpty)
					result.push(temp2);

				break;
			}

		}

		return result;
	}
	//#endregion 用逗号分割

	/***** 分析 *****/

	//#region 第一次分析
	/**第一次分析 */
	static async AnalyseFirst(option: CompileOption) {
		for (let i = 0; i < option.allLines.length; i++) {
			option.index = i;

			const line = option.GetCurrent();
			if (!line || line.lineType !== LineType.None)
				continue;

			switch (line.key) {
				case "command":
					await Command.AnalyseFirst(option);
					break;
				case "instruction":
					line.AnalyseFirst(option);
					break;
				case "variable":
					line.AnalyseFirst(option);
					break;
			}
			
			i = option.index;
		}
	}
	//#endregion 第一次分析

	//#region 第二次分析
	/**第二次分析 */
	static async AnalyseSecond(option: CompileOption) {
		for (let i = 0; i < option.allLines.length; i++) {
			option.index = i;

			const line = option.GetCurrent();
			if (!line || line.lineType !== LineType.None)
				continue;

			let temp;
			switch (line.key) {
				case "unknow":
					const result = Analyser.MatchLine(line.org, false, ["macro", Compiler.enviroment.allMacro]);
					if (result.key === "macro") {
						temp = MacroLine.Create(result.content!, line.comment);
						temp?.AnalyseLabel(option);
					} else {
						temp = LabelLine.Create(line.org, line.comment);
						temp?.Analyse(option);
					}
					break;
				case "command":
					await Command.AnalyseSecond(option);
					break;
			}

			if (temp) {
				option.allLines[option.index] = temp;
			}

			i = option.index;
		}
	}
	//#endregion 第二次分析

	//#region 第三次分析
	/**第三次分析 */
	static async AnalyseThird(option: CompileOption) {
		for (let i = 0; i < option.allLines.length; i++) {
			option.index = i;

			const line = option.GetCurrent();
			if (!line || line.lineType !== LineType.None)
				continue;

			switch (line.key) {
				case "instruction":
					line.AnalyseThird(option);
					break;
				case "command":
					await Command.AnalyseThird(option);
					break;
				case "macro":
					line.AnalyseThird(option);
					break;
				case "variable":
					line.AnalyseThird(option);
					break;
			}

			i = option.index;
		}
	}
	//#endregion 第三次分析

	/***** 文本分析 *****/

	//#region 获取一行内容以及注释
	/**
	 * 获取一行内容以及注释
	 * @param lineText 一行文本
	 * @returns 内容以及注释
	 */
	static GetContent(token: Token): { content: Token, comment: string | undefined } {
		let index = token.text.indexOf(";");
		if (index < 0)
			return { content: token.Copy(), comment: undefined };

		let comment = token.text.substring(index + 1);
		if (comment[0] === "+" || comment[0] === "-")
			comment = token.text.substring(index + 2);

		return { content: token.Substring(0, index), comment };
	}
	//#endregion 获取一行内容以及注释

	//#region 分割基础行，不在字符串内分析
	/**
	 * 分割基础行，不在字符串内分析
	 * @param start 起始分析位置
	 * @param lineText 行内容
	 * @param chars 所有要分析的字符
	 * @returns 
	 */
	private static SplitWithChar(start: number, lineText: string, chars: Set<string> | Map<string, any>) {
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

}