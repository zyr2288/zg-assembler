import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class RenameProvider {

	static Initialize(context: vscode.ExtensionContext) {
		// return;		// 屏蔽注入

		context.subscriptions.push(
			vscode.languages.registerRenameProvider(
				LSPUtils.assembler.config.FileExtension,
				{
					prepareRename: RenameProvider.PrepareRename,
					provideRenameEdits: RenameProvider.Rename
				}
			)
		);
	}

	private static PrepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		const renameClass = LSPUtils.assembler.languageHelper.rename;
		const line = document.lineAt(position.line);
		const charRange = renameClass.PreRename(line.text, position.character);
		const range = new vscode.Range(position.line, charRange.start, position.line, charRange.start + charRange.length);
		return range;
	}

	private static Rename(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken) {
		const renameClass = LSPUtils.assembler.languageHelper.rename;

		const edit = new vscode.WorkspaceEdit();

		const line = document.lineAt(position.line);
		const charRange = renameClass.RenameLabel(line.text, position.character, position.line, document.fileName, newName);
		if (!charRange) 
			return;

		position.line
		position.character

		return edit;
	}
}