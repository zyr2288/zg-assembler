import * as vscode from "vscode";
import { Assembler } from "../Core/Assembler";
import { AssCommands } from "./AssCommands";
import { ConfigUtils } from "./ConfigUtils";
import { DefinitionProvider } from "./DefinitionProvider";
import { Highlighting } from "./Highlighting";
import { HoverProvider } from "./HoverProvider";
import { Intellisense } from "./Intellisense";
import { IOImplementation } from "./IOImplementation";
import { LSPUtils } from "./LSPUtils";
import { UpdateFile } from "./UpdateFile";

const FreshTime = 1000;

export class LanguageServer {

	private assembler!: Assembler;

	async Initialize() {
		LSPUtils.StatueBarShowText(" $(sync~spin) 正在载入汇编插件");

		LSPUtils.assembler = this.assembler = new Assembler();
		await IOImplementation.Initialize();
		await ConfigUtils.ReadConfig();
		this.assembler.Initialize();
		this.SetLanguage(vscode.env.language);

		const classes = [Highlighting, UpdateFile, DefinitionProvider, Intellisense, HoverProvider, AssCommands];
		for (let i = 0; i < classes.length; ++i) {
			let temp = Reflect.get(classes[i], "Initialize");
			await temp();
		}

		UpdateFile.LoadAllFile();

		LSPUtils.StatueBarShowText(" $(check) 载入完成", 3000);
	}

	private SetLanguage(language: string) {
		this.assembler.localization.ChangeLanguage(language);
	}

	//#region 注册命令
	private RegisterMyCommand() {

		//#region 编译主文件
		// vscode.commands.registerTextEditorCommand(this.assembler.config.ExtensionCommandNames.CompliteMain, async () => {
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
		// });
		//#endregion 编译主文件

		//#region 查找路径命令
		// vscode.commands.registerTextEditorCommand(this.assembler.config.ExtensionCommandNames.GetThisFilePath, async (textEditor, edit, ...args: any[]) => {
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
		// });
		//#endregion 查找路径命令

	}
	//#endregion 注册命令
}