import * as vscode from "vscode";
import { Assembler } from "../Core/Assembler";

const FreshTime = 1000;

export class LanguageServer {

	private assembler = new Assembler();

	private freashTreadId?: NodeJS.Timeout;
	private fileUpdateFinished = false;

	async Initialize() {
		this.SetLanguage(vscode.env.language);
		this.RegisterMyCommand();
	}

	private SetLanguage(language: string) {
		this.assembler.localization.ChangeLanguage(language);
	}

	//#region 文档修改时的自动大写以及重新监测
	/**文档修改时的自动大写以及重新监测 */
	private DocumentChange() {
		vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
			if (event.document.languageId !== this.assembler.config.FileExtension.language)
				return;


		});
	}

	private AutoUppercase(match: RegExpExecArray | null, lineNumber: number) {
		if (match == null)
			return false;

		let range = new vscode.Range(lineNumber, match.index, lineNumber, match.index + match[0].length);
		let editor = <vscode.TextEditor>vscode.window.activeTextEditor;
		editor.edit((ee) => {
			// @ts-ignore 目前只能替换一个，原因未知
			ee.replace(range, match[0].toUpperCase());
		});
		return true;
	}
	//#endregion 文档修改时的自动大写以及重新监测

	//#region 注册命令
	private RegisterMyCommand() {

		//#region 编译本文件
		vscode.commands.registerTextEditorCommand(this.assembler.config.ExtensionCommandNames.CompliteThis, async () => {
			if (!vscode.window.activeTextEditor)
				return;

			let text = vscode.window.activeTextEditor.document.getText();
			let filePath = vscode.window.activeTextEditor.document.uri.fsPath;

			this.assembler.compiler.DecodeText([{ text, filePath }]);
			// this.StatueBarShowText(`$(sync~spin) 编译中...`);

			// await this.ReadConfig();

			// let text = vscode.window.activeTextEditor.document.getText();
			// let filePath = vscode.window.activeTextEditor.document.uri.fsPath;

			// let result = await this.assembler.compiler.DecodeText(text, filePath);
			// this.UpdateDiagnostic();

			// await this.OutputResult(result!, {
			// 	toFile: this.assembler.config.ProjectSetting.outputSingleFile,
			// 	copy: this.assembler.config.ProjectSetting.copyToClipboard,
			// 	patchFile: this.assembler.config.ProjectSetting.patchFile
			// });

			// let showText = this.assembler.myException.errorLevel ? ` $(alert) 编译有错误` : ` $(check) 编译完成`;
			// this.StatueBarShowText(showText, 3000);
		});
		//#endregion 编译本文件

		//#region 编译主文件
		vscode.commands.registerTextEditorCommand(this.assembler.config.ExtensionCommandNames.CompliteMain, async () => {
			// if (!vscode.workspace.workspaceFolders)
			// 	return;

			// this.StatueBarShowText(`$(sync~spin) 编译中...`);

			// await this.ReadConfig();

			// let filePath = this.assembler.fileUtils.Combine(vscode.workspace.workspaceFolders[0].uri.fsPath, this.assembler.config.ProjectSetting.entry);
			// let buffer = await this.assembler.fileUtils.ReadFile(filePath);
			// let text = this.assembler.fileUtils.BytesToString(buffer);

			// let result = await this.assembler.compile.CompileText(text, filePath);
			// this.UpdateDiagnostic();

			// await this.OutputResult(result!, {
			// 	toFile: this.assembler.config.ProjectSetting.outputEntryFile,
			// 	copy: this.assembler.config.ProjectSetting.copyToClipboard,
			// 	patchFile: this.assembler.config.ProjectSetting.patchFile
			// });

			// let showText = this.assembler.myException.errorLevel ? ` $(alert) 编译有错误` : ` $(check) 编译完成`;
			// this.StatueBarShowText(showText, 3000);
		});
		//#endregion 编译主文件

		//#region 查找路径命令
		vscode.commands.registerTextEditorCommand(this.assembler.config.ExtensionCommandNames.GetThisFilePath, async (textEditor, edit, ...args: any[]) => {
			// // 参数0 INCLUDE 或 INCBIN
			// // 参数1 空则是第一次执行
			// if (args[0] != ".INCLUDE" && args[0] != ".INCBIN")
			// 	return;

			// let filePath = args[1] ?? textEditor.document.fileName;
			// this.assembler.baseHelper.FileCompletion = {
			// 	type: args[0],
			// 	path: filePath,
			// 	workFolder: vscode.workspace.workspaceFolders![0].uri.fsPath,
			// 	excludeFile: textEditor.document.fileName
			// };
			// vscode.commands.executeCommand("editor.action.triggerSuggest");
		});
		//#endregion 查找路径命令

	}
	//#endregion 注册命令

}