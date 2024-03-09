import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils, PriorityType } from "../Base/ExpressionUtils";
import { LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { DataGroup } from "../Commands/DataGroup";
import { IncludeTag } from "../Commands/Include";
import { Macro } from "../Commands/Macro";
import { CommandLine } from "../Lines/CommandLine";
import { ICommonLine, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { OnlyLabelLine } from "../Lines/OnlyLabelLine";
import { VariableLine } from "../Lines/VariableLine";
import { MatchNames, Platform } from "../Platform/Platform";

export interface MatchRange {
	type: "None" | "Command" | "Instruction" | "Variable" | "Macro";
	start: number;
	text: string;
}

export interface TokenResult {
	dataGroup?: DataGroup;
	macro?: Macro;
	matchToken?: Token;
	matchType: "None" | "Command" | "Label" | "Number" | "Macro" | "Include" | "DataGroup";
	/**Label是hash(number)，DataGroup */
	tag: any;
}

export interface TokenResultTag {
	index: number;
	tokens: Token[];
	value: number;
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
			if (lineNumber < ranges[i].startLine || lineNumber > ranges[i].endLine)
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
	static FindMatchToken(fileHash: number, lineNumber: number, lineText: string, currect: number) {
		const matchResult: TokenResult = {
			dataGroup: undefined,
			macro: undefined,
			matchToken: undefined,
			matchType: "None",
			/**匹配结果附加值，Include是path */
			tag: undefined
		};

		const tempMatch = HelperUtils.BaseSplit(lineText);
		matchResult.matchToken = Token.CreateToken(fileHash, lineNumber, tempMatch.start, tempMatch.text);
		if (HelperUtils._MatchToken(lineNumber, currect, matchResult.matchToken)) {
			switch (tempMatch.type) {
				case "Command":
					matchResult.matchType = "Command";
					return matchResult;
			}
		}
		delete (matchResult.matchToken);

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
					const param = matchResult.macro.params.get(key)!;
					if (HelperUtils._MatchToken(lineNumber, currect, param.label.token)) {
						matchResult.matchToken = param.label.token;
						matchResult.matchType = "Label";
						matchResult.tag = key;
						return matchResult;
					}
				}

				allLines = matchResult.macro.lines;
				break;
			case "DataGroup":
				findLineNumber = rangeType.startLine;
				const dataGroup = Compiler.enviroment.allDataGroup.get(rangeType.key);
				if (dataGroup) {
					matchResult.dataGroup = dataGroup;
				}
				break;
			case "Enum":
				const range = HelperUtils.GetWord(lineText, currect);
				matchResult.matchToken = Token.CreateToken(fileHash, lineNumber, range.start, range.leftText + range.rightText);
				const temp = ExpressionUtils.GetNumber(matchResult.matchToken.text);
				if (temp.success) {
					matchResult.matchType = "Number";
					return matchResult;
				}

				const label = LabelUtils.FindLabel(matchResult.matchToken, matchResult.macro);
				if (label) {
					matchResult.matchType = "Label";
					return matchResult;
				}
				break;
		}

		let temp: { token: Token, hash: number, type: PriorityType } | undefined;
		for (let i = 0; i < allLines.length; i++) {
			const line = allLines[i];
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
							const includeTag = commandLine.tag as IncludeTag;
							if (HelperUtils._MatchToken(lineNumber, currect, includeTag.token)) {
								matchResult.matchType = "Include";
								matchResult.tag = commandLine.tag.path;
								return matchResult;
							}
							break;
					}
					break;
			}

			const olLine = line as OnlyLabelLine;
			const tempLine = line as InstructionLine | CommandLine | VariableLine;
			if (olLine.saveLabel?.label && HelperUtils._MatchToken(lineNumber, currect, olLine.saveLabel.label.token)) {
				matchResult.matchType = "Label";
				matchResult.matchToken = olLine.saveLabel.label.token;
				return matchResult;
			} else if (temp = HelperUtils._FindMatchExp(lineNumber, currect, tempLine.expParts)) {
				matchResult.matchToken = temp.token;
				matchResult.tag = temp.hash;
				switch (temp.type) {
					case PriorityType.Level_1_Label:
						const label = LabelUtils.FindLabel(matchResult.matchToken, matchResult.macro);
						if (label && label.labelType === LabelType.DataGroup) {
							matchResult.matchType = "DataGroup";
							const tempResult = HelperUtils._MatchDatagroup(matchResult.matchToken, currect);
							if (tempResult)
								matchResult.tag = { index: tempResult.index, tokens: tempResult.tokens, value: label.value };
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
					return { token: part.token, hash: part.value as number, type: part.type };
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

	private static _MatchDatagroup(token: Token, currect: number) {
		const tokens = token.Split(/\:/ig);
		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];
			if (t.start <= currect && t.start + t.length >= currect)
				return { index: i, tokens };
		}
	}
	//#endregion 找到光标匹配的Token

}
