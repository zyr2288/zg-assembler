import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class ConfigUtils {

	//#region 读取配置文件
	static async ReadConfig(asmFileUri: vscode.Uri) {
		const workspace = vscode.workspace.getWorkspaceFolder(asmFileUri);
		if (!workspace)
			return;

		const settingFile = LSPUtils.assembler.fileUtils.Combine(
			workspace.uri.fsPath,
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

		LSPUtils.assembler.SwitchPlatform(LSPUtils.assembler.config.ProjectSetting.platform);
	}
	//#endregion 读取配置文件
}