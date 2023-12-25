import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class HoverProvider {
	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerHoverProvider(
				LSPUtils.assembler.config.FileExtension,
				{ provideHover: HoverProvider.Hover }
			)
		)
	}

	static async Hover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {

		await LSPUtils.WaitingCompileFinished();

		const lineText = document.lineAt(position.line).text;
		const temp = LSPUtils.assembler.languageHelper.hoverProvider.Hover(
			document.uri.fsPath, position.line, lineText, position.character);

		return new vscode.Hover(new vscode.MarkdownString(temp));
	}
}