import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class FormatProvider {

	/**初始化 */
	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerDocumentFormattingEditProvider(LSPUtils.assembler.config.FileExtension.language, {
				provideDocumentFormattingEdits: FormatProvider.FormatDocument
			})
		);
	}


	private static FormatDocument(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken) {
		const result: vscode.TextEdit[] = [];

		const lines = LSPUtils.assembler.languageHelper.formatter.Format(document.uri.fsPath, options);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line) {
				continue;
			}
			
			result.push(new vscode.TextEdit(new vscode.Range(i, 0, i, document.lineAt(i).text.length), line));
		}

		return result;
	}

}