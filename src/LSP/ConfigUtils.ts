import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class ConfigUtils {

	static async Initialize() {
		await ConfigUtils.ReadConfig();
	}

	//#region 读取配置文件
	static async ReadConfig() {
		let settingFile = LSPUtils.assembler.fileUtils.Combine(
			vscode.workspace.workspaceFolders![0].uri.fsPath,
			".vscode",
			"project-settings.json"
		);

		if (await LSPUtils.assembler.fileUtils.PathType(settingFile) !== "file") {
			let json = JSON.stringify(LSPUtils.assembler.config.ProjectDefaultSetting);
			let buffer = LSPUtils.assembler.fileUtils.StringToBytes(json);
			await LSPUtils.assembler.fileUtils.SaveFile(settingFile, buffer);
		} else {
			let buffer = await LSPUtils.assembler.fileUtils.ReadFile(settingFile);
			let json = LSPUtils.assembler.fileUtils.BytesToString(buffer);
			LSPUtils.assembler.config.ReadConfigJson(json);
		}
	}
	//#endregion 读取配置文件
}