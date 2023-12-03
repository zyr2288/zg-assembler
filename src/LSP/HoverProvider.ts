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

		const result: vscode.MarkdownString[] = [];

		const temp = LSPUtils.assembler.languageHelper.hoverProvider.Hover(
			document.uri.fsPath,
			position.line,
			document.lineAt(position.line).text,
			position.character
		);

		if (temp.comment) {
			result.push(new vscode.MarkdownString(`**${temp.comment}**`));
		}

		if (temp.value !== undefined) {
			const temp2 = LSPUtils.ConvertValue(temp.value);
			result.push(new vscode.MarkdownString(`HEX: $${temp2.hex}`));
			result.push(new vscode.MarkdownString(`DEC: ${temp2.dec}`));
			result.push(new vscode.MarkdownString(`BIN: @${temp2.bin}`));
		}

		return new vscode.Hover(result);
	}
}