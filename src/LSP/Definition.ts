import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class Definition {

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerDefinitionProvider(
				LSPUtils.assembler.config.FileExtension,
				{ provideDefinition: Definition.Definition }
			)
		);
	}

	private static async Definition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		await LSPUtils.WaitingCompileFinished();

		const result: vscode.Location[] = [];

		const lineText = document.lineAt(position.line).text;
		const temp = await LSPUtils.assembler.languageHelper.definition.GetDefinitionPosition(
			document.uri.fsPath, lineText, position.line, position.character);

		if (!temp || !temp.filePath)
			return result;

		const fileUri = vscode.Uri.file(temp.filePath);
		const filePos = new vscode.Range(temp.line, temp.start, temp.line, temp.start + temp.length);
		const location = new vscode.Location(fileUri, filePos);
		result.push(location);

		return result;
	}

}