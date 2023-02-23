import * as vscode from "vscode";
import { Assembler } from "../Core/Assembler";

export interface WordType {
	startColumn: number;
	text: string;
	type: "path" | "var" | "value" | "none";
	value?: number
}

export class LSPUtils {

	static assembler: Assembler;

	//#region 获取工作目录下所筛选出的文件
	static async GetWorkspaceFilterFile() {
		let includes = `{${LSPUtils.assembler.config.ProjectSetting.includes.join(",")}}`;
		let excludes: string | null = null;
		if (LSPUtils.assembler.config.ProjectSetting.excludes.length !== 0)
			excludes = `{${LSPUtils.assembler.config.ProjectSetting.excludes.join(",")}}`;

		return await vscode.workspace.findFiles(includes, excludes);
	}

	/**查询文件是否在工程内 */
	static async FindFileInProject(file: string) {
		let files = await this.GetWorkspaceFilterFile();
		let searchFiles = files.map(value => value.fsPath);
		return searchFiles.includes(file);
	}
	//#endregion 获取工作目录下所筛选出的文件

}