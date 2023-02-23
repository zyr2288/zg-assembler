import * as vscode from "vscode";
namespace ZGAssembler_LSP {
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


		}
	}
}