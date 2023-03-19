import { Compiler } from "../Base/Compiler";
import { FileUtils } from "../Base/FileUtils";
import { Utils } from "../Base/Utils";

export class HighlightingProvider {

	/**高亮文档 */
	static HighlightDocument(filePath: string) {

		filePath = FileUtils.ArrangePath(filePath);
		let fileHash = Utils.GetHashcode(filePath);
		let lines = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!lines)
			return [];

		let result: { line: number, start: number, length: number, type: number }[] = [];
		let saveToken;

		for (let lineIndex = 0; lineIndex < lines.length; ++lineIndex) {
			const highlightingTokens = lines[lineIndex].GetTokens?.();
			if (highlightingTokens && highlightingTokens.length != 0) {
				for (let j = 0; j < highlightingTokens.length; ++j) {
					saveToken = highlightingTokens[j];
					result.push({
						line: saveToken.token.line,
						start: saveToken.token.start,
						length: saveToken.token.text.length,
						type: saveToken.type
					});
				}
			}
		}
		return result;
	}
}