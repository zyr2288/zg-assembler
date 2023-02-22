export class DefinitionProvider {

	private static GetLabelPosition(lineText: string, currect: number, lineNumber: number, filePath: string) {
		let fileHash = LSPUtils.assembler.utils.GetHashcode(filePath);
		
		let word = LSPUtils.GetWord(lineText, currect);
		let token = {fileHash, line:lineNumber, start:word.startColumn, text:word.text };

		let label = LSPUtils.assembler.labelUtils.FindLabel(token);

	}
}