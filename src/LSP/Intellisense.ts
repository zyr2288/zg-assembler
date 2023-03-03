import * as vscode from "vscode";
import { Completion } from "../Core/LanguageHelper/IntellisenseProvider";
import { CommandName } from "./AssCommands";
import { LSPUtils } from "./LSPUtils";

//#region 提示类型
enum CompletionType {
	Instruction, Command, Macro, Defined, Label, MacroLabel, Folder, File
}
//#endregion 提示类型

export enum TriggerSuggestType {
	Instruction, FilePath
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
		};
		let completions = LSPUtils.assembler.languageHelper.intellisense.Intellisense(doc, option);

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

	private static ProcessSuggest() {
		let result: vscode.CompletionItem[] = [];

		switch (Intellisense.suggestData?.type) {
			case TriggerSuggestType.Instruction:
				const modes = LSPUtils.assembler.languageHelper.intellisense.GetInstructionAddressingModes(Intellisense.suggestData.data);
				if (!modes)
					break;

				for (let i = 0; i < modes.length; ++i) {
					const mode = modes[i];
					let com = new vscode.CompletionItem(mode.showText);
					com.insertText = Intellisense.ChangeExp(mode.insertText);
					com.sortText = mode.index.toString();
					com.kind = vscode.CompletionItemKind.EnumMember
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