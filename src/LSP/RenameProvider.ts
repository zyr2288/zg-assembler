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
		const charRange = renameClass.PreRename(document.fileName, position.line, position.character);
		if (typeof (charRange) === "string") {
			throw charRange;
		}

		const range = new vscode.Range(position.line, charRange.start, position.line, charRange.start + charRange.length);
		return range;
	}

	private static Rename(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken) {
		const renameClass = LSPUtils.assembler.languageHelper.rename;

		const edit = new vscode.WorkspaceEdit();

		const line = document.lineAt(position.line);
		const charRange = renameClass.RenameLabel(newName);
		if (typeof (charRange) === "string") {
			throw charRange;
		}

		const keys = charRange.keys();
		for (const key of keys) {
			const tokens = charRange.get(key)!;
			for (let i = 0; i < tokens.length; i++) {
				const token = tokens[i];

				const uri = vscode.Uri.file(key);
				const range = new vscode.Range(token.line, token.start, token.line, token.start + token.length);
				edit.replace(uri, range, newName);
			}
		}

		return edit;
	}
}