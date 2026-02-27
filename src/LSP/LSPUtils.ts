import * as vscode from "vscode";
import { ZGAssembler } from "../Core/ZGAssembler";

export class LSPUtils {

	static assembler: ZGAssembler;
	static fileUpdateFinished = true;

	private static statusBarItem?: vscode.StatusBarItem;
	private static statusTimer?: NodeJS.Timeout;

	//#region 获取工作目录下所筛选出的文件
	static async GetWorkspaceFilterFile() {
		const includes = `{${LSPUtils.assembler.config.ProjectSetting.includes.join(",")}}`;
		let excludes: string | null = null;
		if (LSPUtils.assembler.config.ProjectSetting.excludes.length !== 0)
			excludes = `{${LSPUtils.assembler.config.ProjectSetting.excludes.join(",")}}`;

		const tempFiles = await vscode.workspace.findFiles(includes, excludes);
		const result: string[] = [];
		let temp;
		for (let i = 0; i < tempFiles.length; i++) {
			temp = LSPUtils.assembler.fileUtils.ArrangePath(tempFiles[i].fsPath);
			result.push(temp);
		}

		return result;
	}

	/**查询文件是否在工程内 */
	static async FindFileInProject(file: string) {
		let files = await LSPUtils.GetWorkspaceFilterFile();
		return files.includes(file);
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
			temp >>>= 8;
		} while (temp !== 0)
		result.bin = result.bin.substring(1);
		result.dec = value.toString();
		result.hex = value.toString(16).toUpperCase();
		return result;
	}
	//#endregion 讲结果值运算成其他进制

	//#region 结果值输出
	static async OutputResult(result: Int16Array, option: { toFile?: string, toClipboard?: boolean }) {
		if (option.toFile) {
			if (!vscode.workspace.workspaceFolders || !vscode.window.activeTextEditor)
				return;

			const buffer = new Uint8Array(result.length);

			for (let i = 0; i < buffer.length; ++i)
				buffer[i] = result[i] < 0 ? 0 : result[i];

			let filePath = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)!.uri.fsPath;
			filePath = LSPUtils.assembler.fileUtils.Combine(filePath, option.toFile);
			await LSPUtils.assembler.fileUtils.SaveFile(filePath, buffer);
		}

		if (option.toClipboard) {
			let temp = LSPUtils.GetResultString(result);
			vscode.env.clipboard.writeText(temp);
		}
	}
	//#endregion 结果值输出

	//#region 获取编译的String
	private static GetResultString(data: Int16Array) {
		let result = "";
		let start = true;
		for (let i = 0; i < data.length; i++) {
			const d = data[i];
			if (d < 0) {
				if (start)
					continue;

				result += "00 ";
			} else {
				let temp = d.toString(16).toUpperCase();
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
	/**
	 * 状态栏显示文本
	 * @param text 要显示的文本
	 * @param timer 显示时间，默认3秒
	 */
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

	//#region 显示信息
	/**
	 * 显示信息
	 * @param message 所显示的信息
	 * @param boxType 信息类型
	 * @param buttons 显示的按钮
	 * @returns 
	 */
	static async ShowMessageBox(message: string, boxType: "info" | "warning" | "error", ...buttons: string[]) {
		let selectButton: string | undefined;
		switch (boxType) {
			case "info":
				selectButton = await vscode.window.showInformationMessage(message, ...buttons);
				break;
			case "warning":
				selectButton = await vscode.window.showWarningMessage(message, ...buttons);
				break;
			case "error":
				selectButton = await vscode.window.showErrorMessage(message, ...buttons);
				break;
		}

		if (!selectButton)
			return -1;

		return buttons.indexOf(selectButton);
	}
	//#endregion 显示信息

	//#region 等待编译完成
	static async WaitingCompileFinished(): Promise<void> {
		return new Promise((resolve, reject) => {
			const temp = setInterval(() => {
				if (LSPUtils.fileUpdateFinished) {
					clearInterval(temp);
					resolve();
				}
			}, 200);
		});
	}
	//#endregion 等待编译完成

}