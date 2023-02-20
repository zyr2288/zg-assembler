import * as vscode from "vscode";
import { Assembler } from "../Core/Assembler";
import { LSPUtils } from "./LSPUtils";

const FreshTime = 1000;

/**更新文件的自动大写以及监视文件改动更新 Label以及错误等 */
export class UpdateFile {

	private static updateFiles: vscode.TextDocumentChangeEvent[] = [];
	private static freashTreadId?: NodeJS.Timeout;
	private static errorCollection: vscode.DiagnosticCollection;

	static async Initialize() {
		UpdateFile.errorCollection ??= vscode.languages.createDiagnosticCollection(LSPUtils.assembler.config.FileExtension.language);

		vscode.workspace.onDidChangeTextDocument(UpdateFile.ChangeDocument);
	}

	private static ChangeDocument(event: vscode.TextDocumentChangeEvent) {
		if (event.document.languageId !== LSPUtils.assembler.config.FileExtension.language)
			return;

		let total = event.contentChanges.length - 1;
		for (let i = 0; i < event.contentChanges.length; ++i) {
			const value = event.contentChanges[i];
			if (value.text.match(/\r\n|\r|\n/)) {
				let lineNumber = value.range.start.line + total;
				total--;
				let content = event.document.lineAt(lineNumber).text;
				let match = new RegExp(LSPUtils.assembler.platform.uppperCaseRegexString, "ig").exec(content);

				if (match === null)
					return;

				let range = new vscode.Range(lineNumber, match.index, lineNumber, match.index + match[0].length);
				let editor = <vscode.TextEditor>vscode.window.activeTextEditor;
				editor.edit((ee) => {
					// @ts-ignore 目前只能替换一个，原因未知
					ee.replace(range, match[0].toUpperCase());
				});
			}
		}

		let index = this.updateFiles.findIndex((value) => {
			return value.document.uri.fsPath === event.document.uri.fsPath;
		});

		if (index < 0)
			this.updateFiles.push(event);

		clearTimeout(UpdateFile.freashTreadId);
		UpdateFile.freashTreadId = setTimeout(async () => {
			for (let i = 0; i < UpdateFile.updateFiles.length; ++i) {
				const file = UpdateFile.updateFiles[i];
				await LSPUtils.assembler.compiler.DecodeText([{ text: file.document.getText(), filePath: file.document.uri.fsPath }]);
			}
			UpdateFile.UpdateDiagnostic();
			UpdateFile.updateFiles = [];
		}, FreshTime);
	}

	/**更新错误 */
	private static UpdateDiagnostic() {
		let errors = LSPUtils.assembler.exceptions.GetExceptions();
		this.errorCollection.clear();
		let result = new Map<string, vscode.Diagnostic[]>();
		// for (let i = 0; i < errors.length; i++) {
		// 	const error = errors[i];
		// 	if (!result.has[error.filePath])
		// 		result[error.filePath] = [];

		// 	if (error.line < 0)
		// 		continue;

		// 	let range = new vscode.Range(error.line, error.start, error.line, error.start + error.length);
		// 	result[error.filePath].push(new vscode.Diagnostic(range, error.message));
		// }

		// for (let key in result) {
		// 	if (key == "undefined")
		// 		continue;

		// 	let uri = vscode.Uri.file(key);
		// 	this.errorCollection.set(uri, result[key]);
		// }
	}

}