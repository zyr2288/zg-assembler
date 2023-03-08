import * as vscode from "vscode";
import { ConfigUtils } from "./ConfigUtils";
import { Intellisense, TriggerSuggestTag } from "./Intellisense";
import { LSPUtils } from "./LSPUtils";
import { UpdateFile } from "./UpdateFile";

export const CommandName = "zgassembler.triggerSuggest";

export class AssCommands {

	static Initialize() {

		// 注册智能提示
		vscode.commands.registerCommand(CommandName, async (tag: TriggerSuggestTag) => {
			Intellisense.suggestData = tag;
			await vscode.commands.executeCommand("editor.action.triggerSuggest");
			delete (Intellisense.suggestData);
		});

		// 编译本文件
		vscode.commands.registerTextEditorCommand(LSPUtils.assembler.config.ExtensionCommandNames.CompliteThis, AssCommands.CompileThisFile);

		// 编译入口文件
		vscode.commands.registerTextEditorCommand(LSPUtils.assembler.config.ExtensionCommandNames.CompliteMain, AssCommands.CompileEntryFile);
	}

	/**编译本文件 */
	private static async CompileThisFile() {
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
	}

	/**编译入口文件 */
	private static async CompileEntryFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		vscode.workspace.saveAll(false);

		LSPUtils.StatueBarShowText(` $(sync~spin) 编译中...`, 0);

		await ConfigUtils.ReadConfig();

		let filePath = LSPUtils.assembler.fileUtils.Combine(
			vscode.workspace.workspaceFolders[0].uri.fsPath,
			LSPUtils.assembler.config.ProjectSetting.entry
		);

		let data = await LSPUtils.assembler.fileUtils.ReadFile(filePath);
		let text = LSPUtils.assembler.fileUtils.BytesToString(data);

		let result = await LSPUtils.assembler.compiler.CompileText(filePath, text);
		UpdateFile.UpdateDiagnostic();

		await LSPUtils.OutputResult(result!, {
			toFile: LSPUtils.assembler.config.ProjectSetting.outputSingleFile,
			toClipboard: LSPUtils.assembler.config.ProjectSetting.copyToClipboard,
			patchFile: LSPUtils.assembler.config.ProjectSetting.patchFile
		});

		let showText = LSPUtils.assembler.diagnostic.hasError ? ` $(alert) 编译有错误` : ` $(check) 编译完成`;
		LSPUtils.StatueBarShowText(showText, 3000);
	}

}