import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";
interface FileCompletion {
	type: ".INCLUDE" | ".INCBIN",
	path: string,
	workFolder: string,
	excludeFile: string,
}

export class Intellisense {

	static async Initialize() {
		vscode.languages.registerCompletionItemProvider(LSPUtils.assembler.config.FileExtension, {
			provideCompletionItems: Intellisense.ShowCompletion
		}, ".", ":")
	}

	private static fileCompletion: FileCompletion;
	private static readonly ignoreWordStr = /;|(^|\s+)(\.HEX|\.DBG|\.DWG|\.MACRO)(\s+|$)/ig;


	private static async ShowCompletion(document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): Promise<vscode.CompletionItem[]> {

		let doc = {
			filePath: document.uri.fsPath,
			lineNumber: position.line,
			allText: document.getText(),
			currect: document.offsetAt(position),
			lineText: document.lineAt(position.line).text,
			lineCurrect: position.character,
		};
		let option = {
			trigger: context.triggerCharacter
		}
		LSPUtils.assembler.languageHelper.intellisense.Intellisense(doc, option);

		return [];
	}
}