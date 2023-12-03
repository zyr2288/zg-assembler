import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class FormatProvide {
	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerDocumentFormattingEditProvider(
				LSPUtils.assembler.config.FileExtension,
				{
					provideDocumentFormattingEdits: FormatProvide.Format
				}
			)
		);
	}

	private static async Format(document: vscode.TextDocument, option: vscode.FormattingOptions, token: vscode.CancellationToken) {
		await LSPUtils.WaitingCompileFinished();

		LSPUtils.assembler.languageHelper.format.FormatDocument(document.fileName);

		const result: vscode.TextEdit[] = [];
		return result;

	}

}