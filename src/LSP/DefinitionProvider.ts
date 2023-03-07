import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class DefinitionProvider {
	
	static async Initialize() {
		vscode.languages.registerDefinitionProvider(
			LSPUtils.assembler.config.FileExtension,
			{ provideDefinition: DefinitionProvider.Definition }
		)
	}

	private static Definition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let result: vscode.Location[] = [];

		let temp = LSPUtils.assembler.languageHelper.definition.GetLabelPosition(
			document.uri.fsPath, position.line, document.lineAt(position.line).text, position.character
		);

		if (temp.filePath !== "") {
			let fileUri = vscode.Uri.file(temp.filePath);
			let filePos = new vscode.Range(temp.line, temp.start, temp.line, temp.start);
			let location = new vscode.Location(fileUri, filePos);
			result.push(location);
		}

		return result;
	}

}