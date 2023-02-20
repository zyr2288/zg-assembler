import * as vscode from "vscode";
import { Assembler } from "../Core/Assembler";

export class ConfigUtils {

	private static assembler: Assembler;

	static async Initialize(assembler: Assembler) {
		ConfigUtils.assembler ??= assembler;
		await ConfigUtils.ReadConfig();
	}

	//#region 读取配置文件
	static async ReadConfig() {
		
		let settingFile = ConfigUtils.assembler.fileUtils.Combine(
			vscode.workspace.workspaceFolders![0].uri.fsPath,
			".vscode",
			"project-settings.json"
		);

		if (await ConfigUtils.assembler.fileUtils.PathType(settingFile) !== "file") {
			let json = JSON.stringify(ConfigUtils.assembler.config.ProjectDefaultSetting);
			let buffer = ConfigUtils.assembler.fileUtils.StringToBytes(json);
			await ConfigUtils.assembler.fileUtils.SaveFile(settingFile, buffer);
		} else {
			let buffer = await ConfigUtils.assembler.fileUtils.ReadFile(settingFile);
			let json = ConfigUtils.assembler.fileUtils.BytesToString(buffer);
			ConfigUtils.assembler.config.ReadConfigJson(json);
		}
	}
	//#endregion 读取配置文件
}