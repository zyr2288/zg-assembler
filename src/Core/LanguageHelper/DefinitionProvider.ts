import { Compiler } from "../Base/Compiler";
import { PriorityType } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Macro } from "../Commands/Macro";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { HelperUtils } from "./HelperUtils";

export class DefinitionProvider {

	/**获取标签的定义的位置 */
	static async GetLabelPosition(filePath: string, lineNumber: number, lineText: string, currect: number) {

		const result = { filePath: "", line: 0, start: 0, length: 0 };
		const fileHash = FileUtils.GetFilePathHashcode(filePath);

		const commonLine = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!commonLine)
			return result;

		let findLine: InstructionLine | CommandLine | undefined;
		for (let i = 0; i < commonLine.length; i++) {
			const line = commonLine[i];
			if (!line.orgText)
				continue;

			if (line.orgText.line === lineNumber) {
				findLine = line as InstructionLine | CommandLine;
				break;
			}
		}

		if (!findLine)
			return result;

		if (findLine.type === LineType.Command) {
			const commandLine = findLine as CommandLine;
			switch (commandLine.command.text) {
				case ".INCLUDE":
				case ".INCBIN":
					const tag: { path: string, token: Token } = commandLine.tag;
					if (currect >= tag.token.start && currect <= tag.token.start + tag.token.length)
						result.filePath = tag.path;

					return result;
			}
		}

		const rangeType = HelperUtils.GetRange(fileHash, lineNumber);
		let macro: Macro | undefined;
		if (rangeType?.type === "Macro")
			macro = Compiler.enviroment.allMacro.get(rangeType.key);

		for (let i = 0; i < findLine.expParts.length; i++) {
			for (let j = 0; j < findLine.expParts[i].length; j++) {
				const part = findLine.expParts[i][j];
				if (part.type !== PriorityType.Level_1_Label ||
					part.token.start > currect ||
					part.token.start + part.token.text.length < currect)
					continue;

				const label = LabelUtils.FindLabelWithHash(part.value, macro);
				if (!label)
					return result;

				result.filePath = Compiler.enviroment.GetFile(label.token.fileHash);
				result.line = label.token.line;
				result.start = label.token.start;
				result.length = label.token.text.length;
				return result;

			}
		}


		// const line = Token.CreateToken(fileHash, lineNumber, 0, lineText);
		// const { content } = Compiler.GetContent(line);
		// if (currect > content.start + content.text.length)
		// 	return result;

		// const word = HelperUtils.GetWord(line.text, currect, line.start);
		// const tempMatch = HelperUtils.BaseSplit(line.text, line.start);
		// if (tempMatch.type === "command") {
		// 	switch (tempMatch.text) {
		// 		case ".HEX":
		// 			return result;
		// 		case ".INCLUDE":
		// 		case ".INCBIN":
		// 			const start = tempMatch.start + tempMatch.text.length;
		// 			if (start < word.start &&
		// 				lineText.substring(start, word.start).trim() === "") {
		// 				const path = word.leftText.substring(1) + word.rightText.substring(0, word.rightText.length - 1);
		// 				result.filePath = await DefinitionProvider.GetFilePath(filePath, path);
		// 			}
		// 			return result;
		// 	}
		// }

		// const rangeType = HelperUtils.GetRange(fileHash, lineNumber);
		// let macro: Macro | undefined;

		// if (rangeType?.type === "Macro")
		// 	macro = Compiler.enviroment.allMacro.get(rangeType.key);

		// const wordText = word.leftText + word.rightText;
		// const token = Token.CreateToken(fileHash, lineNumber, word.start, wordText);
		// const labelResult = LabelUtils.FindLabel(token, macro);
		// if (labelResult) {
		// 	result.filePath = Compiler.enviroment.GetFile(labelResult.label.token.fileHash);
		// 	result.line = labelResult.label.token.line;
		// 	result.start = labelResult.label.token.start;
		// 	result.length = labelResult.label.token.text.length;
		// } else if (new RegExp(Compiler.enviroment.macroRegexString).test(wordText)) {
		// 	const macro = Compiler.enviroment.allMacro.get(wordText);
		// 	if (macro) {
		// 		result.filePath = Compiler.enviroment.GetFile(macro.name.fileHash);
		// 		result.line = macro.name.line;
		// 		result.start = macro.name.start;
		// 		result.length = macro.name.text.length;
		// 	}
		// }

		return result;
	}

	private static async GetFilePath(filePath: string, path: string) {
		let folder = await FileUtils.GetPathFolder(filePath);
		return FileUtils.Combine(folder, path);
	}
}

