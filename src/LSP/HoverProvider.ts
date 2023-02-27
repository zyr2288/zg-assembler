import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class HoverProvider {
	static Initialize() {
		vscode.languages.registerHoverProvider(
			LSPUtils.assembler.config.FileExtension,
			{ provideHover: HoverProvider.Hover }
		);
	}

	static Hover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		let result: vscode.MarkdownString[] = [];

		let temp = LSPUtils.assembler.languageHelper.hoverProvider.Hover(
			document.uri.fsPath,
			position.line,
			document.lineAt(position.line).text,
			position.character
		);

		if (temp.comment) {
			result.push(new vscode.MarkdownString(`**${temp.comment}**`));
		}

		if (temp.value !== undefined) {
			let temp2 = LSPUtils.ConvertValue(temp.value);
			result.push(new vscode.MarkdownString(`HEX: $${temp2.hex}`));
			result.push(new vscode.MarkdownString(`DEC: ${temp2.dec}`));
			result.push(new vscode.MarkdownString(`BIN: @${temp2.bin}`));
		} 
	
		return new vscode.Hover(result);
	}
}