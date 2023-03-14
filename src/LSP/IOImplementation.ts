import * as vscode from "vscode";
import { TextDecoder, TextEncoder } from "util";
import { LSPUtils } from "./LSPUtils";

/**
 * 文件接口
 * 
 * 信息输出
 */
export class IOImplementation {

	private static messageOutput = vscode.window.createOutputChannel("ZG Assembler");

	static async Initialize() {

		LSPUtils.assembler.fileUtils.BytesToString = IOImplementation.BytesToString;
		LSPUtils.assembler.fileUtils.GetFolderFiles = IOImplementation.GetFolderFiles;
		LSPUtils.assembler.fileUtils.PathType = IOImplementation.PathType;
		LSPUtils.assembler.fileUtils.ReadFile = IOImplementation.ReadFile;
		LSPUtils.assembler.fileUtils.SaveFile = IOImplementation.SaveFile;
		LSPUtils.assembler.fileUtils.ShowMessage = IOImplementation.ShowMessage;
		LSPUtils.assembler.fileUtils.StringToBytes = IOImplementation.StringToByte;
	}

	static BytesToString(data: Uint8Array) {
		let decoder = new TextDecoder();
		return decoder.decode(data);
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
		let uri = vscode.Uri.file(path);
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

	static StringToByte(text: string) {
		let encoder = new TextEncoder();
		return encoder.encode(text);
	}

}