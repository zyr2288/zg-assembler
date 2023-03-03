import { Compiler } from "../Base/Compiler";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { HelperUtils } from "./HelperUtils";

export class DefinitionProvider {

	static GetLabelPosition(filePath: string, lineNumber: number, lineText: string, currect: number,) {

		let result = { filePath: "", line: 0, start: 0 };

		let fileHash = Utils.GetHashcode(filePath);
		let word = HelperUtils.GetWord(lineText, currect);
		let token = Token.CreateToken(fileHash, lineNumber, word.startColumn, word.text);
		let label = LabelUtils.FindLabel(token);
		if (label) {
			result.filePath = Compiler.enviroment.GetFile(label.token.fileHash);
			result.line = label.token.line;
			result.start = label.token.start;
			return result;
		}

		let macro = Compiler.enviroment.allMacro.get(token.text);
		if (macro) {
			result.filePath = Compiler.enviroment.GetFile(macro.name.fileHash);
			result.line = macro.name.line;
			result.start = macro.name.start;
			return result;
		}

		return result;
	}
}

