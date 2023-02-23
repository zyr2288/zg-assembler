import { Compiler } from "../Base/Compiler";
import { Utils } from "../Base/Utils";
import { HelperUtils } from "./HelperUtils";

export class HighlightingProvider {

	/**高亮文档 */
	static async HighlightDocument(filePath: string) {

		await HelperUtils.WaitFileUpdateFinished();

		let fileHash = Utils.GetHashcode(filePath);
		let lines = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!lines)
			return [];

		let result: { line: number, start: number, length: number, type: number }[] = [];
		let saveToken;

		for (let i = 0; i < lines.length; ++i) {
			const line = lines[i];
			const highlightingTokens = line.GetTokens?.();
			if (highlightingTokens) {
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