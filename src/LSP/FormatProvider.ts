import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class FormatProvider {

	/**初始化 */
	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerDocumentFormattingEditProvider(LSPUtils.assembler.config.FileExtension.language, {
				provideDocumentFormattingEdits: FormatProvider.FormatDocument
			})
		);
	}


	private static FormatDocument(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken) {
		const result: vscode.TextEdit[] = [];

		const lines = LSPUtils.assembler.languageHelper.formatter.Format(document.uri.fsPath, options);
		let docLineNum = -1;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			docLineNum++;
			if (!line)
				continue;

			const docLine = document.lineAt(docLineNum);
			let commentIndex = FormatProvider.GetCommentIndex(docLine.text);
			if (commentIndex < 0)
				commentIndex = docLine.text.length;

			result.push(new vscode.TextEdit(new vscode.Range(docLineNum, 0, docLineNum, commentIndex), line.curLine));
			if (line.newLine)
				result.push(new vscode.TextEdit(new vscode.Range(docLineNum, docLine.text.length, docLineNum, docLine.text.length), line.newLine));
			
		}

		return result;
	}

	//#region 获取行的注释，包括注释前的空白
	/**
	 * 获取行的注释，包括注释前的空白
	 * @param line 要检查的行
	 * @returns 注释的开始位置
	 */
	private static GetCommentIndex(line: string) {
		let index = -1, findComment = false, inString = false;
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === "\"") {
				inString = !inString;
				index = -1;
				continue;
			}

			if (inString) {
				index = -1;
				continue;
			}

			switch (char) {
				case ";":
					findComment = true;
					break;
				case " ":
				case "\t":
					if (index === -1)
						index = i;

					continue;
				default:
					index = -1;
					continue;
			}
			break;
		}
		if (!findComment)
			index = -1;

		return index;
	}
	//#endregion 获取行的注释，包括注释前的空白

}