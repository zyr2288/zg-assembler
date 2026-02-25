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

	/**智能提示显示类型 */
	private static CompletionShowType: vscode.CompletionItemKind[] = [
		vscode.CompletionItemKind.Keyword,			// Instruction
		vscode.CompletionItemKind.Snippet,			// AddressingType
		vscode.CompletionItemKind.Property,			// Command
		vscode.CompletionItemKind.Function,			// Macro
		vscode.CompletionItemKind.Constant,			// Defined
		vscode.CompletionItemKind.Reference,		// Label
		vscode.CompletionItemKind.Variable,			// Variable
		vscode.CompletionItemKind.TypeParameter,	// UnknowLabel
		vscode.CompletionItemKind.Field,			// MacroParamter
		vscode.CompletionItemKind.Folder,			// Folder
		vscode.CompletionItemKind.File				// File
	];

	/**初始化 */
	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerCompletionItemProvider(LSPUtils.assembler.config.FileExtension, {
				provideCompletionItems: Intellisense.ShowCompletion
			}, " ", ".", ":", "/")
		);
	}

	//#region 显示智能提示
	/**
	 * 显示智能提示
	 * @param document 
	 * @param position 
	 * @param token 
	 * @param context 
	 * @returns 
	 */
	private static async ShowCompletion(document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	) {

		if (Intellisense.suggestData) {
			let result = await Intellisense.ProcessSuggest();
			delete (Intellisense.suggestData);
			return result;
		}

		const completions = await LSPUtils.assembler.languageHelper.intellisense.Intellisense({
			filePath: document.uri.fsPath,
			lineNumber: position.line,
			lineText: document.lineAt(position.line).text,
			current: position.character,
			trigger: context.triggerCharacter
		});

		const result: vscode.CompletionItem[] = [];

		for (let i = 0; i < completions.length; ++i) {
			const com = completions[i];
			const newCom = new vscode.CompletionItem(com.showText);
			newCom.insertText = new vscode.SnippetString(com.insertText);
			newCom.sortText = com.index.toString();

			if (com.comment)
				newCom.documentation = new vscode.MarkdownString(com.comment);

			// 不会再走这里
			switch (com.triggerType) {
				case TriggerSuggestType.AllAsm:
				case TriggerSuggestType.AllFile:
					const path = LSPUtils.assembler.fileUtils.ArrangePath(document.uri.fsPath);
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

			if (com.type === undefined)
				continue;

			newCom.kind = Intellisense.CompletionShowType[com.type];
		}
		return result;
	}
	//#endregion 显示智能提示

	//#region 处理智能提示
	/**处理智能提示 */
	private static async ProcessSuggest() {
		const result: vscode.CompletionItem[] = [];

		let data;
		switch (Intellisense.suggestData?.type) {
			case TriggerSuggestType.AllAsm:
			case TriggerSuggestType.AllFile:
				if (!vscode.workspace.workspaceFolders)
					break;

				const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;

				data = Intellisense.suggestData.data as FileHelperData;
				const files = await LSPUtils.assembler.languageHelper.intellisense.GetFileHelper(
					rootPath, data.path, Intellisense.suggestData.type, data.exclude);

				for (let i = 0; i < files.length; ++i) {
					const file = files[i];
					const com = new vscode.CompletionItem(file.showText);
					com.insertText = new vscode.SnippetString(file.insertText);
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
	//#endregion 处理智能提示

}