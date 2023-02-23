import { Utils } from "../Base/Utils";
import { HelperUtils } from "./HelperUtils";

export class DefinitionProvider {
	private static GetLabelPosition(lineText: string, currect: number, lineNumber: number, filePath: string) {
		let fileHash = Utils.GetHashcode(filePath);

		let word = HelperUtils.GetWord(lineText, currect);
		let token = { fileHash, line: lineNumber, start: word.startColumn, text: word.text };

		// let label = LabelUtils.FindLabel(token);
	}
}

