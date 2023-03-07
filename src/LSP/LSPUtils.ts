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
	static fileUpdateFinished = true;

	private static statusBarItem?: vscode.StatusBarItem;
	private static statusTimer?: NodeJS.Timeout;

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

	//#region 讲结果值运算成其他进制
	/**
	 * 讲结果值运算成其他进制
	 * @param value 要运算的值
	 * @returns 2 10 16进制结果
	 */
	static ConvertValue(value: number) {
		let result = { bin: "", dec: "", hex: "" };

		let temp = value;
		do {
			let temp2 = (temp & 0xFF).toString(2);
			let array = temp2.padStart(8, "0").split("");
			array.splice(4, 0, " ");
			temp2 = array.join("");
			result.bin = " " + temp2 + result.bin;
			temp >>= 8;
		} while (temp != 0)
		result.bin = result.bin.substring(1);
		result.dec = value.toString();
		result.hex = value.toString(16).toUpperCase();

		return result;
	}
	//#endregion 讲结果值运算成其他进制

	//#region 结果值输出
	static async OutputResult(result: number[], option: { toFile?: string, patchFile?: string, toClipboard?: boolean }) {
		let buffer = new Uint8Array(result);

		if (option.toFile) {
			if (!vscode.workspace.workspaceFolders)
				return;

			let filePath = this.assembler.fileUtils.Combine(vscode.workspace.workspaceFolders[0].uri.fsPath, option.toFile);
			this.assembler.fileUtils.SaveFile(filePath, buffer);
		}

		if (option.toClipboard) {
			let temp = LSPUtils.GetResultString(result);
			vscode.env.clipboard.writeText(temp);
		}

		if (option.patchFile) {
			if (!vscode.workspace.workspaceFolders)
				return;

			let filePath = this.assembler.fileUtils.Combine(vscode.workspace.workspaceFolders[0].uri.fsPath, option.patchFile);
			if (await this.assembler.fileUtils.PathType(filePath) !== "file")
				return;

			let fileBuffer = await this.assembler.fileUtils.ReadFile(filePath);
			for (let i = 0; i < result.length; i++) {
				if (result[i] === undefined)
					continue;

				fileBuffer[i] = result[i];
			}
		}
	}
	//#endregion 结果值输出

	//#region 获取编译的String
	private static GetResultString(data: number[]) {
		let result = "";
		let start = true;
		for (let i = 0; i < data.length; i++) {
			const d = data[i];
			if (d === undefined) {
				if (start)
					continue;

				result += "00 ";
			} else {
				let temp = d.toString(16);
				temp = temp.toUpperCase();
				if (temp.length < 2)
					temp = "0" + temp;

				result += temp + " ";
				start = false;
			}
		}
		return result;
	}
	//#endregion 获取编译的String

	//#region 状态栏显示文本
	static StatueBarShowText(text: string, timer = 3000) {
		if (LSPUtils.statusTimer)
			clearTimeout(LSPUtils.statusTimer);

		if (!LSPUtils.statusBarItem)
			LSPUtils.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

		LSPUtils.statusBarItem.text = text;
		LSPUtils.statusBarItem.show();

		if (timer > 0)
			LSPUtils.statusTimer = setTimeout(() => { LSPUtils.statusBarItem?.hide(); }, timer);
	}
	//#endregion 状态栏显示文本

	//#region 等待编译完成
	static async WaitingCompileFinished(): Promise<void> {
		return new Promise((resolve, reject) => {
			let temp = setInterval(() => {
				if (LSPUtils.fileUpdateFinished) {
					clearInterval(temp);
					resolve();
				}
			}, 200);
		});
	}
	//#endregion 等待编译完成

}