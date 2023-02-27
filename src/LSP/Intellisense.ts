import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

//#region 提示类型
enum CompletionType {
	Instruction, Command, Macro, Defined, Label, MacroLabel, Folder, File
}
//#endregion 提示类型

export class Intellisense {

	private static CompletionShowType: vscode.CompletionItemKind[] = [
		vscode.CompletionItemKind.Keyword, vscode.CompletionItemKind.Method, vscode.CompletionItemKind.Function,
		vscode.CompletionItemKind.Enum, vscode.CompletionItemKind.Struct, vscode.CompletionItemKind.TypeParameter,
		vscode.CompletionItemKind.Folder, vscode.CompletionItemKind.File
	];

	static async Initialize() {
		vscode.languages.registerCompletionItemProvider(LSPUtils.assembler.config.FileExtension, {
			provideCompletionItems: Intellisense.ShowCompletion
		}, ".", ":")
	}

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
		let completions = LSPUtils.assembler.languageHelper.intellisense.Intellisense(doc, option);

		let result: vscode.CompletionItem[] = [];
		for (let i = 0; i < completions.length; ++i) {
			const com = completions[i];
			let newCom = new vscode.CompletionItem(com.showText);
			newCom.insertText = com.insertText;
			newCom.sortText = com.index.toString();
			result.push(newCom);

			if (!com.type)
				continue;

			newCom.kind = Intellisense.CompletionShowType[com.type];
		}

		return result;
	}

}