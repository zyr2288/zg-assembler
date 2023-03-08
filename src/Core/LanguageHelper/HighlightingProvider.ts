import { Compiler } from "../Base/Compiler";
import { Utils } from "../Base/Utils";

export class HighlightingProvider {

	/**高亮文档 */
	static HighlightDocument(filePath: string) {

		let fileHash = Utils.GetHashcode(filePath);
		let lines = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!lines)
			return [];

		let result: { line: number, start: number, length: number, type: number }[] = [];
		let saveToken;

		lines.forEach(line => {
			const highlightingTokens = line.GetTokens?.();
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
		});
		return result;
	}
}