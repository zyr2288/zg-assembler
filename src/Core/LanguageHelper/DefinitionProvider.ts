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
import { HelperUtils, TokenResultTag } from "./HelperUtils";

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

		const match = HelperUtils.FindMatchToken(fileHash, lineNumber, lineText, currect);
		switch (match.matchType) {
			case "None":
				break;

			case "Include":
				result.filePath = match.tag;
				break;

			case "Label":
				const label = LabelUtils.FindLabel(match.matchToken, match.macro);
				if (!label)
					break;

				DefinitionProvider.SetResultToken(result, label.token);
				break;
			case "Macro":
				if (!match.matchToken)
					break;

				const macro = Compiler.enviroment.allMacro.get(match.matchToken.text);
				DefinitionProvider.SetResultToken(result, macro?.name);
				break;
			case "DataGroup":
				if (!match.matchToken)
					break;

				const data = LabelUtils.FindLabel(match.matchToken);
				DefinitionProvider.SetResultToken(result, data?.token);
				break;
		}
		return result;
	}

	private static SetResultToken(result: DefinitionResult, token?: Token) {
		if (!token)
			return;

		result.filePath = Compiler.enviroment.GetFile(token.fileHash);
		result.line = token.line;
		result.start = token.start;
		result.length = token.length;
	}
}

