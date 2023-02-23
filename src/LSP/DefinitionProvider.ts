import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class DefinitionProvider {
	static async Initialize() {
		vscode.languages.registerDefinitionProvider(
			LSPUtils.assembler.config.FileExtension,
			{ provideDefinition: DefinitionProvider.Definition }
		)
	}

	private static async Definition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let result: vscode.Location[] = [];

		let text = document.lineAt(position.line);
		let temp = DefinitionProvider.GetLabelPosition(text.text, position.character, position.line, document.uri.fsPath);

		// if (temp.filePath.trim() != "") {
		// 	let fileUri = vscode.Uri.file(temp.filePath);
		// 	let filePos = new vscode.Range(temp.lineNumber, temp.startColumn, temp.lineNumber, temp.startColumn + temp.length);
		// 	let location = new vscode.Location(fileUri, filePos);
		// 	result.push(location);
		// }

		return result;
	}

	private static GetLabelPosition(lineText: string, currect: number, lineNumber: number, filePath: string) {
		// let fileHash = LSPUtils.assembler.utils.GetHashcode(filePath);

		// let word = LSPUtils.GetWord(lineText, currect);
		// let token = {fileHash, line:lineNumber, start:word.startColumn, text:word.text };

		// let label = LSPUtils.assembler.labelUtils.FindLabel(token);

	}
}