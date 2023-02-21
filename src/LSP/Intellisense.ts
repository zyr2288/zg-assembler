import * as vscode from "vscode";
import { Token } from "../Core/Base/Token";

interface FileCompletion {
	type: ".INCLUDE" | ".INCBIN",
	path: string,
	workFolder: string,
	excludeFile: string,
}

export class Intellisense {

	private static fileCompletion: FileCompletion;
	private static readonly ignoreWordStr = /;|(^|\s+)(\.HEX|\.DBG|\.DWG|\.MACRO)(\s+|$)/ig;


	static async ShowCompletion(
		document: { fileHash: number, lineNumber: number, allText: string, currect: number, lineText: string, lineCurrect: number },
		option: { trigger?: string }
	) {

		let line = Token.CreateToken(document.fileHash, document.lineNumber, 0, document.lineText);
		let leftText = line.Substring(0, document.lineCurrect);

		// 左边文本有忽略内容
		if (Intellisense.ignoreWordStr.test(leftText.text))
			return [];
	}
}