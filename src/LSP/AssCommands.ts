import * as vscode from "vscode";
import { ConfigUtils } from "./ConfigUtils";
import { Intellisense, TriggerSuggestTag } from "./Intellisense";
import { LSPUtils } from "./LSPUtils";
import { UpdateFile } from "./UpdateFile";

export const CommandName = "zg-assembly.triggerSuggest";

export class AssCommands {

	static Initialize(context: vscode.ExtensionContext) {
		// 注册智能提示
		context.subscriptions.push(
			vscode.commands.registerCommand(CommandName, (tag: TriggerSuggestTag) => {
				Intellisense.suggestData = tag;
				vscode.commands.executeCommand("editor.action.triggerSuggest");
			}));

		// 编译本文件
		context.subscriptions.push(
			vscode.commands.registerTextEditorCommand(
				LSPUtils.assembler.config.ExtensionCommandNames.CompliteThis,
				AssCommands.CompileThisFile
			));


		// 编译入口文件
		context.subscriptions.push(
			vscode.commands.registerTextEditorCommand(
				LSPUtils.assembler.config.ExtensionCommandNames.CompliteMain,
				AssCommands.CompileEntryFile
			));
	}

	/**编译本文件 */
	static async CompileThisFile() {
		if (!vscode.window.activeTextEditor)
			return;

		LSPUtils.StatueBarShowText(` $(sync~spin) ${LSPUtils.assembler.localization.GetMessage("compiling")}...`, 0);
		await LSPUtils.WaitingCompileFinished();

		const text = vscode.window.activeTextEditor.document.getText();
		const filePath = vscode.window.activeTextEditor.document.uri.fsPath;
		let fileName = await LSPUtils.assembler.fileUtils.GetFileName(filePath);
		const index = fileName.lastIndexOf(".");
		if (index > 0)
			fileName = fileName.substring(0, index);

		await ConfigUtils.ReadConfig();

		const result = await LSPUtils.assembler.CompileText(text, filePath);
		UpdateFile.UpdateDiagnostic();
		if (result) {
			let toFile = LSPUtils.assembler.config.ProjectSetting.outputSingleFile;
			toFile = toFile.replace(/\[name\]/g, fileName);
			await LSPUtils.OutputResult(result, { toFile, toClipboard: LSPUtils.assembler.config.ProjectSetting.copyToClipboard });
		}

		const showText = LSPUtils.assembler.diagnostic.hasError ?
			` $(alert) ${LSPUtils.assembler.localization.GetMessage("compile error")}` :
			` $(check) ${LSPUtils.assembler.localization.GetMessage("compile finished")}`;
		LSPUtils.StatueBarShowText(showText, 3000);
	}

	/**编译入口文件 */
	static async CompileEntryFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		LSPUtils.StatueBarShowText(` $(sync~spin) ${LSPUtils.assembler.localization.GetMessage("compiling")}...`, 0);

		await LSPUtils.WaitingCompileFinished();
		await ConfigUtils.ReadConfig();

		const filePath = LSPUtils.assembler.fileUtils.Combine(
			vscode.workspace.workspaceFolders[0].uri.fsPath,
			LSPUtils.assembler.config.ProjectSetting.entry
		);

		if (await LSPUtils.assembler.fileUtils.PathType(filePath) !== "file") {
			const errorMsg = LSPUtils.assembler.localization.GetMessage("File {0} is not exist", filePath);
			vscode.window.showErrorMessage(errorMsg);
			LSPUtils.StatueBarShowText(` $(alert) ${LSPUtils.assembler.localization.GetMessage("compile error")}`, 3000);
			return;
		}

		await vscode.workspace.saveAll(false);

		const data = await LSPUtils.assembler.fileUtils.ReadFile(filePath);
		const text = LSPUtils.assembler.fileUtils.BytesToString(data);

		const result = await LSPUtils.assembler.CompileText(text, filePath);
		UpdateFile.UpdateDiagnostic();

		if (result) {
			await LSPUtils.OutputResult(result, {
				toFile: LSPUtils.assembler.config.ProjectSetting.outputEntryFile,
				toClipboard: LSPUtils.assembler.config.ProjectSetting.copyToClipboard
			});
		}

		const showText = LSPUtils.assembler.diagnostic.hasError ?
			` $(alert) ${LSPUtils.assembler.localization.GetMessage("compile error")}` :
			` $(check) ${LSPUtils.assembler.localization.GetMessage("compile finished")}`;
		LSPUtils.StatueBarShowText(showText, 3000);
	}

}