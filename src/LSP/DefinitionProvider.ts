import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class DefinitionProvider {

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerDefinitionProvider(
				LSPUtils.assembler.config.FileExtension,
				{ provideDefinition: DefinitionProvider.Definition }
			)
		);
	}

	private static async Definition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		await LSPUtils.WaitingCompileFinished();

		const result: vscode.Location[] = [];

		const temp = await LSPUtils.assembler.languageHelper.definition.GetLabelPosition(document.uri.fsPath, position.line, position.character);

		if (temp.filePath !== "") {
			const fileUri = vscode.Uri.file(temp.filePath);
			const filePos = new vscode.Range(temp.line, temp.start, temp.line, temp.start + temp.length);
			const location = new vscode.Location(fileUri, filePos);
			result.push(location);
		}

		return result;
	}

}