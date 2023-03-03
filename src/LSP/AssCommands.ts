import * as vscode from "vscode";
import { Intellisense, TriggerSuggestTag } from "./Intellisense";

export const CommandName = "zgassembler.triggerSuggest";

export class AssCommands {

	static async Initialize() {

		// 注册智能提示
		vscode.commands.registerCommand(CommandName, async (tag: TriggerSuggestTag) => {
			Intellisense.suggestData = tag;
			await vscode.commands.executeCommand("editor.action.triggerSuggest");
			delete(Intellisense.suggestData);
		});
	}

}