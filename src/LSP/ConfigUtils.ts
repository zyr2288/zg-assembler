import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class ConfigUtils {

	//#region 读取配置文件
	static async ReadConfig() {
		const settingFile = LSPUtils.assembler.fileUtils.Combine(
			vscode.workspace.workspaceFolders![0].uri.fsPath,
			"project-settings.json"
		);

		if (await LSPUtils.assembler.fileUtils.PathType(settingFile) !== "file") {
			const json = JSON.stringify(LSPUtils.assembler.config.ProjectDefaultSetting);
			const buffer = LSPUtils.assembler.fileUtils.StringToBytes(json);
			await LSPUtils.assembler.fileUtils.SaveFile(settingFile, buffer);
		} else {
			const buffer = await LSPUtils.assembler.fileUtils.ReadFile(settingFile);
			const json = LSPUtils.assembler.fileUtils.BytesToString(buffer);
			LSPUtils.assembler.config.ReadConfigJson(json);
		}
	}
	//#endregion 读取配置文件
}