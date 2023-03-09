import { Compiler } from "../Base/Compiler";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { HelperUtils } from "./HelperUtils";

export class DefinitionProvider {

	static GetLabelPosition(filePath: string, lineNumber: number, lineText: string, currect: number) {

		let result = { filePath: "", line: 0, start: 0 };

		let word = HelperUtils.GetWord(lineText, currect);
		let tempMatch = HelperUtils.BaseSplit(lineText);
		if (tempMatch.type === "command") {
			switch (tempMatch.text) {
				case ".INCLUDE":
				case ".INCBIN":
					break;
			}
		}

		return result;
	}
}

