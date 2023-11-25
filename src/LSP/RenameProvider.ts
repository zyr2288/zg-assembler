import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class RenameProvider {

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerRenameProvider(
				LSPUtils.assembler.config.FileExtension,
				{ provideRenameEdits: RenameProvider.Rename, }
			)
		);
	}

	private static PrepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
	}

	private static Rename(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken) {
		let edit = new vscode.WorkspaceEdit();

		let renameClass = LSPUtils.assembler.languageHelper.rename;


		position.line
		position.character


		return edit;
	}
}