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

}