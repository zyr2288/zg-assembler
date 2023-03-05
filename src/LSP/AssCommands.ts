import * as vscode from "vscode";
import { ConfigUtils } from "./ConfigUtils";
import { Intellisense, TriggerSuggestTag } from "./Intellisense";
import { LSPUtils } from "./LSPUtils";
import { UpdateFile } from "./UpdateFile";

export const CommandName = "zgassembler.triggerSuggest";

export class AssCommands {

	static async Initialize() {

		// 注册智能提示
		vscode.commands.registerCommand(CommandName, async (tag: TriggerSuggestTag) => {
			Intellisense.suggestData = tag;
			await vscode.commands.executeCommand("editor.action.triggerSuggest");
			delete (Intellisense.suggestData);
		});

		//#region 编译本文件
		vscode.commands.registerTextEditorCommand(LSPUtils.assembler.config.ExtensionCommandNames.CompliteThis, async () => {
			if (!vscode.window.activeTextEditor)
				return;

			LSPUtils.StatueBarShowText(` $(sync~spin) 编译中...`, 0);

			let text = vscode.window.activeTextEditor.document.getText();
			let filePath = vscode.window.activeTextEditor.document.uri.fsPath;

			await ConfigUtils.ReadConfig();

			let result = await LSPUtils.assembler.compiler.CompileText(filePath, text);
			UpdateFile.UpdateDiagnostic();

			await LSPUtils.OutputResult(result!, {
				toFile: LSPUtils.assembler.config.ProjectSetting.outputSingleFile,
				toClipboard: LSPUtils.assembler.config.ProjectSetting.copyToClipboard,
				patchFile: LSPUtils.assembler.config.ProjectSetting.patchFile
			});

			let showText = LSPUtils.assembler.diagnostic.hasError ? ` $(alert) 编译有错误` : ` $(check) 编译完成`;
			LSPUtils.StatueBarShowText(showText, 3000);
		});
		//#endregion 编译本文件
	}

}