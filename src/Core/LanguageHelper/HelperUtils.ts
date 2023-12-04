import { Compiler } from "../Base/Compiler";
import { ExpressionPart, PriorityType } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { DataGroup } from "../Commands/DataGroup";
import { Macro } from "../Commands/Macro";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { MatchNames, Platform } from "../Platform/Platform";

export interface MatchRange {
	type: "None" | "Command" | "Instruction" | "Variable" | "Macro";
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
		const result: MatchRange = { type: "None", start: 0, text: "" };
		let match = new RegExp(Platform.regexString, "ig").exec(lineText);
		if (match?.groups?.[MatchNames.command]) {
			result.type = "Command";
			result.text = match.groups[MatchNames.command];
		} else if (match?.groups?.[MatchNames.instruction]) {
			result.type = "Instruction";
			result.text = match.groups[MatchNames.instruction];
		} else if ((match?.groups?.[MatchNames.variable])) {
			result.type = "Variable";
		} else if (match = Compiler.enviroment.MatchMacroRegex(lineText)) {
			result.type = "Macro";
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

	//#region 找到光标匹配的Token
	/**
	 * 找到光标匹配的Token
	 * @param fileHash 文件Hash
	 * @param lineNumber 行号
	 * @param currect 光标位置
	 * @returns 
	 */
	static FindMatchToken(fileHash: number, lineNumber: number, currect: number) {
		const matchResult = {
			dataGroup: undefined as DataGroup | undefined,
			macro: undefined as Macro | undefined,
			matchToken: undefined as Token | undefined,
			matchType: "None" as "None" | "Label" | "Number" | "Macro" | "Include" | "DataGroup",
			/**匹配结果附加值，Label是labelHash，Include是path */
			tag: undefined as any
		};

		let allLines = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!allLines)
			return matchResult;

		const rangeType = HelperUtils.GetRange(fileHash, lineNumber);
		let findLineNumber = lineNumber;

		switch (rangeType?.type) {
			case "Macro":
				matchResult.macro = Compiler.enviroment.allMacro.get(rangeType.key)!;
				if (HelperUtils._MatchToken(lineNumber, currect, matchResult.macro.name)) {
					matchResult.matchToken = matchResult.macro.name;
					matchResult.matchType = "Macro";
					return matchResult;
				}

				for (const key of matchResult.macro.labels.keys()) {
					const label = matchResult.macro.labels.get(key)!;
					if (HelperUtils._MatchToken(lineNumber, currect, label.token)) {
						matchResult.matchToken = label.token;
						matchResult.matchType = "Label";
						matchResult.tag = key;
						return matchResult;
					}
				}

				for (const key of matchResult.macro.params.keys()) {
					const label = matchResult.macro.params.get(key)!;
					if (HelperUtils._MatchToken(lineNumber, currect, label.token)) {
						matchResult.matchToken = label.token;
						matchResult.matchType = "Label";
						matchResult.tag = key;
						return matchResult;
					}
				}

				allLines = matchResult.macro.lines;
				break;
			case "DataGroup":
				findLineNumber = rangeType.start;
				const keyHash = Utils.GetHashcode(rangeType.key);
				const dataGroup = Compiler.enviroment.allDataGroup.get(keyHash);
				if (dataGroup) {
					matchResult.dataGroup = dataGroup;
				}
				break;
		}

		let temp: { token: Token, hash: number, type: PriorityType } | undefined;
		for (let i = 0; i < allLines.length; i++) {
			const line = allLines[i] as InstructionLine | CommandLine | MacroLine;
			if (line.orgText.line !== findLineNumber)
				continue;

			switch (line.type) {
				case LineType.Macro:
					const macroLine = line as MacroLine;
					if (HelperUtils._MatchToken(lineNumber, currect, macroLine.macroToken)) {
						matchResult.matchType = "Macro";
						matchResult.matchToken = macroLine.macroToken;
						return matchResult;
					}
					break;
				case LineType.Command:
					const commandLine = line as CommandLine;
					switch (commandLine.command.text) {
						case ".INCLUDE":
						case ".INCBIN":
							if (HelperUtils._MatchToken(lineNumber, currect, commandLine.expParts[0][0]?.token)) {
								matchResult.matchType = "Include";
								matchResult.tag = commandLine.tag.path;
								return matchResult;
							}
							break;
					}
					break;
			}

			if (HelperUtils._MatchToken(lineNumber, currect, line.label?.token)) {
				matchResult.matchType = "Label";
				matchResult.matchToken = line.label?.token;
				matchResult.tag = line.label?.hash;
				return matchResult;
			} else if (temp = HelperUtils._FindMatchExp(lineNumber, currect, line.expParts)) {
				matchResult.matchToken = temp.token;
				matchResult.tag = temp.hash;
				switch (temp.type) {
					case PriorityType.Level_1_Label:
						const label = LabelUtils.FindLabel(matchResult.matchToken, matchResult.macro);
						if (label && label.label.labelType === LabelType.DataGroup) {
							matchResult.matchType = "DataGroup";
							matchResult.tag = label.label.value;
						} else {
							matchResult.matchType = "Label";
						}
						break;
					case PriorityType.Level_2_Number:
						matchResult.matchType = "Number";
						break;
				}
				return matchResult;
			}
		}

		return matchResult;
	}

	private static _FindMatchExp(lineNumber: number, currect: number, expParts?: ExpressionPart[][]) {
		if (!expParts)
			return;

		for (let i = 0; i < expParts.length; i++) {
			for (let j = 0; j < expParts[i].length; j++) {
				const part = expParts[i][j];
				if (part.type !== PriorityType.Level_1_Label && part.type !== PriorityType.Level_2_Number)
					continue;

				if (HelperUtils._MatchToken(lineNumber, currect, part.token))
					return { token: part.token, hash: part.value, type: part.type };
			}
		}
	}

	private static _MatchToken(lineNumber: number, currect: number, token?: Token) {
		if (!token)
			return false;

		if (token.line === lineNumber &&
			token.start <= currect &&
			token.start + token.length >= currect)
			return true;

		return false;
	}
	//#endregion 找到光标匹配的Token

}
