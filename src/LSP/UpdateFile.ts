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
		await UpdateFile.LoadAllFile();
	}

	/**载入所有工程文件 */
	private static async LoadAllFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		LSPUtils.fileUpdateFinished = false;
		let files = await LSPUtils.GetWorkspaceFilterFile();

		let tempFiles: { text: string, filePath: string }[] = [];
		for (let i = 0; i < files.length; i++) {
			let buffer = await LSPUtils.assembler.fileUtils.ReadFile(files[i].fsPath);
			let text = LSPUtils.assembler.fileUtils.BytesToString(buffer);
			tempFiles.push({ text, filePath: files[i].fsPath });
		}
		await LSPUtils.assembler.compiler.DecodeText(tempFiles);
		LSPUtils.fileUpdateFinished = true;

		UpdateFile.UpdateDiagnostic();
	}

	/**文档变更 */
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

		let index = UpdateFile.updateFiles.findIndex((value) => {
			return value.document.uri.fsPath === event.document.uri.fsPath;
		});

		if (index < 0)
			UpdateFile.updateFiles.push(event);

		LSPUtils.fileUpdateFinished = false;
		clearTimeout(UpdateFile.freashTreadId);
		UpdateFile.freashTreadId = setTimeout(async () => {
			let files: { text: string, filePath: string }[] = [];
			for (let i = 0; i < UpdateFile.updateFiles.length; ++i) {
				const file = UpdateFile.updateFiles[i];
				files.push({ text: file.document.getText(), filePath: file.document.uri.fsPath });
			}
			await LSPUtils.assembler.compiler.DecodeText(files);
			UpdateFile.UpdateDiagnostic();
			UpdateFile.updateFiles = [];
			LSPUtils.fileUpdateFinished = true;
		}, FreshTime);
	}

	/**更新错误 */
	private static UpdateDiagnostic() {
		let errors = LSPUtils.assembler.exceptions.GetExceptions();
		UpdateFile.errorCollection.clear();
		let result = new Map<string, vscode.Diagnostic[]>();

		for (let i = 0; i < errors.length; ++i) {
			const error = errors[i];
			let diagnostics = result.get(error.filePath);
			if (!diagnostics) {
				diagnostics = [];
				result.set(error.filePath, diagnostics);
			}

			if (error.line < 0)
				continue;

			let range = new vscode.Range(error.line, error.start, error.line, error.start + error.length);
			diagnostics.push(new vscode.Diagnostic(range, error.message));
		}

		result.forEach((value, key, map) => {
			let uri = vscode.Uri.file(key);
			this.errorCollection.set(uri, value);
		})
	}

}