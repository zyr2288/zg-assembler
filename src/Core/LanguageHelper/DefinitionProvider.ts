import { Compiler } from "../Base/Compiler";
import { FileUtils } from "../Base/FileUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { IMacro } from "../Commands/Macro";
import { HelperUtils } from "./HelperUtils";

export class DefinitionProvider {

	static async GetLabelPosition(filePath: string, lineNumber: number, lineText: string, currect: number) {

		let result = { filePath: "", line: 0, start: 0, length: 0 };
		let fileHash = FileUtils.GetFilePathHashcode(filePath);

		const line = Token.CreateToken(fileHash, lineNumber, 0, lineText);
		const { content } = Compiler.GetContent(line);
		if (currect > content.start + content.text.length)
			return result;

		let word = HelperUtils.GetWord(line.text, currect, line.start);
		let tempMatch = HelperUtils.BaseSplit(line.text, line.start);
		if (tempMatch.type === "command") {
			switch (tempMatch.text) {
				case ".HEX":
					return result;
				case ".INCLUDE":
				case ".INCBIN":
					let start = tempMatch.start + tempMatch.text.length;
					if (start < word.start &&
						lineText.substring(start, word.start).trim() === "") {
						let path = word.rangeText[0].substring(1) + word.rangeText[1].substring(0, word.rangeText[1].length - 1);
						result.filePath = await DefinitionProvider.GetFilePath(filePath, path);
					}
					return result;
			}
		}

		let rangeType = HelperUtils.GetRange(fileHash, lineNumber);
		let macro: IMacro | undefined;

		if (rangeType?.type === "Macro")
			macro = Compiler.enviroment.allMacro.get(rangeType.key);

		let wordText = word.rangeText.join("");
		let token = Token.CreateToken(fileHash, lineNumber, word.start, wordText);
		let label = LabelUtils.FindLabel(token, macro);
		if (label) {
			result.filePath = Compiler.enviroment.GetFile(label.token.fileHash);
			result.line = label.token.line;
			result.start = label.token.start;
			result.length = label.token.text.length;
		} else if (new RegExp(Compiler.enviroment.macroRegexString).test(wordText)) {
			let macro = Compiler.enviroment.allMacro.get(wordText);
			if (macro) {
				result.filePath = Compiler.enviroment.GetFile(macro.name.fileHash);
				result.line = macro.name.line;
				result.start = macro.name.start;
				result.length = macro.name.text.length;
			}
		}

		return result;
	}

	private static async GetFilePath(filePath: string, path: string) {
		let folder = await FileUtils.GetPathFolder(filePath);
		return FileUtils.Combine(folder, path);
	}
}

