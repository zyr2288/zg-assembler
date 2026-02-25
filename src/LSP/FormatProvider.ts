import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class FormatProvider {

	/**初始化 */
	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerDocumentFormattingEditProvider(LSPUtils.assembler.config.FileExtension, {
				provideDocumentFormattingEdits: FormatProvider.FormatDocument
			})
		);
	}


	private static FormatDocument(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken) {
		const result: vscode.TextEdit[] = [];

		const lines = LSPUtils.assembler.languageHelper.formatter.Format(document.getText(), options);

		return result;
	}

}