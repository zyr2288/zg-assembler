import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

/**
 * 文件接口
 * 
 * 信息输出
 */
export class IOImplementation {

	private static messageOutput = vscode.window.createOutputChannel("ZG Assembler");

	static Initialize() {
		LSPUtils.assembler.fileUtils.Implement({
			ReadFile: IOImplementation.ReadFile,
			SaveFile: IOImplementation.SaveFile,
			GetFolderFiles: IOImplementation.GetFolderFiles,
			PathType: IOImplementation.PathType,
			ShowMessage: IOImplementation.ShowMessage
		});
	}


	static async GetFolderFiles(path: string) {
		path = await LSPUtils.assembler.fileUtils.GetPathFolder(path);
		let uri = vscode.Uri.file(path);
		let temp = await vscode.workspace.fs.readDirectory(uri);
		let result: { name: string; type: "file" | "folder"; }[] = [];

		for (let i = 0; i < temp.length; i++) {
			const value = temp[i];
			let t = { name: value[0], type: <"file" | "folder">"file" };
			if (value[1] == vscode.FileType.Directory)
				t.type = "folder";
			else if (value[1] != vscode.FileType.File)
				continue;

			result.push(t);
		}
		return result;
	}

	static async PathType(path: string) {
		const uri = vscode.Uri.file(path);
		try {
			let stat = await vscode.workspace.fs.stat(uri);
			switch (stat.type) {
				case vscode.FileType.File:
					return "file";
				case vscode.FileType.Directory:
					return "path";
			}
			return "none";
		} catch {
			return "none";
		}
	}

	static async ReadFile(path: string) {
		let uri = vscode.Uri.file(path);
		let result = await vscode.workspace.fs.readFile(uri);
		return result;
	}

	static async SaveFile(filePath: string, data: Uint8Array) {
		let uri = vscode.Uri.file(filePath);
		await vscode.workspace.fs.writeFile(uri, data);
	}

	static ShowMessage(message: string) {
		IOImplementation.messageOutput.append(message);
		IOImplementation.messageOutput.show(true);
	}

}