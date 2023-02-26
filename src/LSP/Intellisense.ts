import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

//#region 提示类型
enum CompletionType {
	Instruction, Command, Macro, Label, MacroLabel, Folder, File
}
//#endregion 提示类型

export class Intellisense {

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
			switch (com.type as CompletionType | undefined) {
				case CompletionType.Command:
					newCom.kind = vscode.CompletionItemKind.Method;
					break;
				case CompletionType.Instruction:
					newCom.kind = vscode.CompletionItemKind.Keyword;
					break;
				case CompletionType.File:
					newCom.kind = vscode.CompletionItemKind.File;
					break;
				case CompletionType.Folder:
					newCom.kind = vscode.CompletionItemKind.Folder;
					break;
				case CompletionType.Label:
					newCom.kind = vscode.CompletionItemKind.Struct;
					break;
				case CompletionType.Macro:
					newCom.kind = vscode.CompletionItemKind.Function;
					break;
			}
			result.push(newCom);
		}


		return result;
	}

}