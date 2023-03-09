import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export enum TriggerSuggestType {
	None, Instruction, FilePath
}

export interface TriggerSuggestTag {
	type: TriggerSuggestType;
	data: string;
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
			return Intellisense.ProcessSuggest();
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
			// if (com.type === CompletionType.Instruction) {
			// 	newCom.command = {
			// 		title: "Assembler Suggest Show",
			// 		command: CommandName,
			// 		arguments: [{
			// 			type: TriggerSuggestType.Instruction,
			// 			data: com.showText,
			// 		} as TriggerSuggestTag]
			// 	}
			// }
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
			// case TriggerSuggestType.Instruction:
			// 	const modes = LSPUtils.assembler.languageHelper.intellisense.GetInstructionAddressingModes(Intellisense.suggestData.data);
			// 	if (!modes)
			// 		break;

			// 	for (let i = 0; i < modes.length; ++i) {
			// 		const mode = modes[i];
			// 		let com = new vscode.CompletionItem(mode.showText);
			// 		com.insertText = Intellisense.ChangeExp(mode.insertText);
			// 		com.sortText = mode.index.toString();
			// 		com.kind = vscode.CompletionItemKind.EnumMember
			// 		result.push(com);
			// 	}
			// 	break;
			case TriggerSuggestType.FilePath:
				if (!vscode.workspace.workspaceFolders)
					break;

				let path = Intellisense.suggestData.data;
				let top = path === vscode.workspace.workspaceFolders[0].uri.fsPath;
				const files = await LSPUtils.assembler.languageHelper.intellisense.GetFileHelper(path, top);
				for (let i = 0; i < files.length; ++i) {
					const file = files[i];

					let com = new vscode.CompletionItem(file.showText);
					com.insertText = Intellisense.ChangeExp(file.insertText);
					com.sortText = file.index.toString();
					com.kind = Intellisense.CompletionShowType[file.type!];
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