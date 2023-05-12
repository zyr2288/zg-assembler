import * as vscode from "vscode";
import { CommandName } from "./AssCommands";
import { LSPUtils } from "./LSPUtils";

enum TriggerSuggestType {
	None, AllAsm, AllFile
}

export interface TriggerSuggestTag {
	type: TriggerSuggestType;
	data: any;
}

interface FileHelperData {
	path: string;
	exclude: string;
}

export class Intellisense {

	static suggestData?: TriggerSuggestTag;

	private static CompletionShowType: vscode.CompletionItemKind[] = [
		vscode.CompletionItemKind.Keyword, vscode.CompletionItemKind.Method, vscode.CompletionItemKind.Function,
		vscode.CompletionItemKind.Enum, vscode.CompletionItemKind.Struct, vscode.CompletionItemKind.TypeParameter,
		vscode.CompletionItemKind.Folder, vscode.CompletionItemKind.File
	];

	static async Initialize() {
		vscode.languages.registerCompletionItemProvider(LSPUtils.assembler.config.FileExtension, {
			provideCompletionItems: Intellisense.ShowCompletion
		}, " ", ".", ":")
	}

	private static async ShowCompletion(document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): Promise<vscode.CompletionItem[]> {

		if (Intellisense.suggestData) {
			let result = await Intellisense.ProcessSuggest();
			delete (Intellisense.suggestData);
			return result;
		}

		let completions = LSPUtils.assembler.languageHelper.intellisense.Intellisense(
			document.uri.fsPath,
			position.line,
			document.lineAt(position.line).text,
			position.character,
			context.triggerCharacter
		);

		let result: vscode.CompletionItem[] = [];

		for (let i = 0; i < completions.length; ++i) {
			const com = completions[i];
			let newCom = new vscode.CompletionItem(com.showText);
			newCom.insertText = Intellisense.ChangeExp(com.insertText);
			newCom.sortText = com.index.toString();

			if (com.comment)
				newCom.detail = com.comment;

			// 不会再走这里
			switch (com.triggerType) {
				case TriggerSuggestType.AllAsm:
				case TriggerSuggestType.AllFile:
					let path = LSPUtils.assembler.fileUtils.ArrangePath(document.uri.fsPath);
					newCom.command = {
						title: "Get Folder Files",
						command: CommandName,
						arguments: [{
							type: com.triggerType,
							data: { path: path, exclude: path } as FileHelperData
						} as TriggerSuggestTag]
					};
					break;
			}
			result.push(newCom);

			if (!com.type)
				continue;

			newCom.kind = Intellisense.CompletionShowType[com.type];
		}
		return result;
	}

	private static async ProcessSuggest() {
		let result: vscode.CompletionItem[] = [];

		switch (Intellisense.suggestData?.type) {
			case TriggerSuggestType.AllAsm:
			case TriggerSuggestType.AllFile:
				if (!vscode.workspace.workspaceFolders)
					break;

				let rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;

				let data = Intellisense.suggestData.data as FileHelperData;
				const files = await LSPUtils.assembler.languageHelper.intellisense.GetFileHelper(
					rootPath, data.path, Intellisense.suggestData.type, data.exclude);

				for (let i = 0; i < files.length; ++i) {
					const file = files[i];
					let com = new vscode.CompletionItem(file.showText);
					com.insertText = Intellisense.ChangeExp(file.insertText);
					com.sortText = file.index.toString();
					com.kind = Intellisense.CompletionShowType[file.type!];
					if (com.kind === vscode.CompletionItemKind.Folder) {
						com.insertText.value += "/";
						let path = await LSPUtils.assembler.fileUtils.GetPathFolder(data.path);
						path = LSPUtils.assembler.fileUtils.Combine(path, file.showText);
						com.command = {
							title: "Get Folder Files",
							command: CommandName,
							arguments: [{
								type: Intellisense.suggestData.type,
								data: { path, exclude: data.exclude }
							} as TriggerSuggestTag]
						};
					}
					result.push(com);
				}
				break;
		}
		return result;
	}

	private static ChangeExp(text: string) {
		let result = "";
		let match;

		let regx = /\[exp\]/g;
		let start = 0;
		let index = 0;
		while (match = regx.exec(text)) {
			result += text.substring(start, match.index) + `$\{${index}}`;
			start = match.index + match[0].length;
			index++;
		}

		result += text.substring(start);
		return new vscode.SnippetString(result);
	}

}