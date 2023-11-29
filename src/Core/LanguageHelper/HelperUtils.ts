import { Compiler } from "../Base/Compiler";
import { Token } from "../Base/Token";
import { Macro } from "../Commands/Macro";
import { CommandLine } from "../Lines/CommandLine";
import { ICommonLine, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { OnlyLabelLine } from "../Lines/OnlyLabelLine";
import { MatchNames, Platform } from "../Platform/Platform";

type MacthLineType = InstructionLine | MacroLine | CommandLine;

export interface MatchRange {
	type: "none" | "command" | "instruction" | "variable" | "macro";
	start: number;
	text: string;
}

export class HelperUtils {

	//#region 基础分割行
	/**
	 * 基础分割行
	 * @param lineText 一行文本
	 * @returns 分割结果
	 */
	static BaseSplit(lineText: string, start = 0): MatchRange {
		let result: MatchRange = { type: "none", start: 0, text: "" };
		let match = new RegExp(Platform.regexString, "ig").exec(lineText);
		if (match?.groups?.[MatchNames.command]) {
			result.type = "command";
			result.text = match.groups[MatchNames.command];
		} else if (match?.groups?.[MatchNames.instruction]) {
			result.type = "instruction";
			result.text = match.groups[MatchNames.instruction];
		} else if ((match?.groups?.[MatchNames.variable])) {
			result.type = "variable"
		}

		if (match)
			result.start = match[0].indexOf(result.text) + match.index + start;

		return result;
	}
	//#endregion 基础分割行

	//#region 获取光标所在字符
	/**
	 * 获取光标所在字符
	 * @param lineText 一行文本
	 * @param currect 当前光标未知
	 * @returns rangeText: 为光标左边文本和光标右边文本, start: range[0] + start 
	 */
	static GetWord(lineText: string, currect: number, start = 0) {

		let inString = false;
		let lastString = "";

		const range = [0, 0];
		currect -= start;

		const match = "\t +-*/&|!^#,()[]{}<>";
		let findEnd = false;

		for (let i = 0; i < lineText.length; ++i) {

			if (inString && lineText[i] !== "\"") {
				lastString = lineText[i];
				continue;
			}

			if (lineText[i] === "\"") {
				if (!inString) {
					inString = true;
					range[0] = i;
				} else if (lastString !== "\\") {
					inString = false;
					range[1] = i + 1;
					findEnd = true;
				}
			} else if (match.includes(lineText[i])) {
				findEnd = !findEnd
				if (findEnd)
					range[1] = i;
				else
					range[0] = i + 1;
			}

			if (findEnd) {
				if (currect >= range[0] && currect <= range[1]) {
					break;
				} else {
					findEnd = false;
					range[0] = i + 1;
				}
			}

			lastString = lineText[i];
		}

		if (!findEnd)
			range[1] = lineText.length;

		const leftText = lineText.substring(range[0], currect);
		const rightText = lineText.substring(currect, range[1]);

		return { leftText, rightText, start: range[0] + start };
	}
	//#endregion 获取光标所在字符

	//#region 所在行的作用域，例如 Macro 或 DataGroup
	/**
	 * 所在行的作用域，例如 Macro 或 DataGroup
	 * @param fileHash 文件hash
	 * @param lineNumber 行号
	 * @returns 作用域类型
	 */
	static GetRange(fileHash: number, lineNumber: number) {
		let ranges = Compiler.enviroment.GetRange(fileHash);
		let rangeType = undefined;
		for (let i = 0; i < ranges.length; ++i) {
			if (lineNumber < ranges[i].start || lineNumber > ranges[i].end)
				continue;

			rangeType = ranges[i];
			break;
		}
		return rangeType;
	}
	//#endregion 所在行的作用域，例如 Macro 或 DataGroup

	//#region 获取匹配的行
	/**
	 * 获取匹配的行
	 * @param fileHash 文件名Hash
	 * @param line 匹配的行
	 * @returns macro 和 matchLine
	 */
	static FindMatchLine(fileHash: number, line: number) {
		let allLine = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!allLine)
			return { macro: undefined, matchLine: undefined };

		let findLineNumber = line;
		const rangeType = HelperUtils.GetRange(fileHash, line);

		let macro: Macro | undefined;
		let matchLine: MacthLineType | undefined;

		switch (rangeType?.type) {
			case "Macro":
				macro = Compiler.enviroment.allMacro.get(rangeType.key)!;
				matchLine = HelperUtils._FindMatchLine(findLineNumber, macro.lines);
				break;
			case "DataGroup":
				findLineNumber = rangeType.start;
				break;
		}

		if (!matchLine)
			matchLine = HelperUtils._FindMatchLine(findLineNumber, allLine);

		return { macro, matchLine };
	}

	private static _FindMatchLine(lineNumber: number, allLine: ICommonLine[]) {
		let matchLine: MacthLineType | undefined;
		for (let i = 0; i < allLine.length; i++) {
			const line = allLine[i];
			if (line.orgText.line !== lineNumber)
				continue;
			
			switch(line.type) {
				case LineType.Instruction:
					const insLine = line as InstructionLine;

					break;
			}
		}
		return matchLine;
	}

	private static _FindMatchToken(...tokens:Token[]) {
		
	}
	//#endregion 获取匹配的行

}
