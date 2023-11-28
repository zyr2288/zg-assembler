import { Compiler } from "../Base/Compiler";
import { PriorityType } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Macro } from "../Commands/Macro";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { HelperUtils } from "./HelperUtils";

interface DefinitionResult {
	filePath: string;
	line: number;
	start: number;
	length: number;
}

export class DefinitionProvider {

	/**获取标签的定义的位置 */
	static async GetLabelPosition(filePath: string, lineNumber: number, lineText: string, currect: number) {

		const result: DefinitionResult = { filePath: "", line: 0, start: 0, length: 0 };
		const fileHash = FileUtils.GetFilePathHashcode(filePath);

		const commonLine = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!commonLine)
			return result;

		const match = HelperUtils.FindMatchLine(fileHash, lineNumber);

		if (!match.matchLine)
			return result;

		if (match.matchLine.type === LineType.Command) {
			const commandLine = match.matchLine as CommandLine;
			switch (commandLine.command.text) {
				case ".INCLUDE":
				case ".INCBIN":
					const tag: { path: string, token: Token } = commandLine.tag;
					if (currect >= tag.token.start && currect <= tag.token.start + tag.token.length)
						result.filePath = tag.path;

					return result;
			}
		}

		switch (match.matchLine.type) {
			case LineType.Macro:
				const macroLine = match.matchLine as MacroLine;
				if (macroLine.macroToken.start <= currect && macroLine.macroToken.start + macroLine.macroToken.length >= currect) {
					DefinitionProvider.SetResultToken(result, macroLine.macro.name);
					return result;
				}
				break;
		}

		for (let i = 0; i < match.matchLine.expParts.length; i++) {
			for (let j = 0; j < match.matchLine.expParts[i].length; j++) {
				const part = match.matchLine.expParts[i][j];
				if (part.type !== PriorityType.Level_1_Label ||
					part.token.line !== lineNumber ||
					part.token.start > currect ||
					part.token.start + part.token.length < currect)
					continue;

				const label = LabelUtils.FindLabelWithHash(part.value, match.macro);
				if (!label)
					return result;

				DefinitionProvider.SetResultToken(result, label.token);
				return result;
			}
		}

		return result;
	}

	private static SetResultToken(result: DefinitionResult, token: Token) {
		result.filePath = Compiler.enviroment.GetFile(token.fileHash);
		result.line = token.line;
		result.start = token.start;
		result.length = token.length;
	}
}

