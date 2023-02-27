import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";


const FreshTime = 1000;

/**更新文件的自动大写以及监视文件改动更新 Label以及错误等 */
export class UpdateFile {

	private static updateFiles: vscode.TextDocumentChangeEvent[] = [];
	private static freashTreadId?: NodeJS.Timeout;
	private static errorCollection: vscode.DiagnosticCollection;

	static async Initialize() {
		UpdateFile.errorCollection ??= vscode.languages.createDiagnosticCollection(LSPUtils.assembler.config.FileExtension.language);

		await UpdateFile.LoadAllFile();
		vscode.workspace.onDidChangeTextDocument(UpdateFile.ChangeDocument);
	}

	/**载入所有工程文件 */
	private static async LoadAllFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		let files = await LSPUtils.GetWorkspaceFilterFile();

		let tempFiles: { text: string, filePath: string }[] = [];
		for (let i = 0; i < files.length; i++) {
			let buffer = await LSPUtils.assembler.fileUtils.ReadFile(files[i].fsPath);
			let text = LSPUtils.assembler.fileUtils.BytesToString(buffer);
			tempFiles.push({ text, filePath: files[i].fsPath });
		}
		await LSPUtils.assembler.LoadAllFile(tempFiles);

		UpdateFile.UpdateDiagnostic();
	}

	/**文档变更 */
	private static async ChangeDocument(event: vscode.TextDocumentChangeEvent) {
		if (event.document.languageId !== LSPUtils.assembler.config.FileExtension.language)
			return;

		for (let i = 0; i < event.contentChanges.length; ++i) {
			const value = event.contentChanges[i];
			if (value.text.match(/\r\n|\r|\n/)) {
				let lineNumber = value.range.start.line;
				let content = event.document.lineAt(lineNumber).text;
				let match = LSPUtils.assembler.languageHelper.documentChange.AutoUpperCase(content);
				if (!match)
					continue;

				let range = new vscode.Range(lineNumber, match.index, lineNumber, match.index + match.length);
				let editor = vscode.window.activeTextEditor!;
				editor.edit((ee) => {
					ee.replace(range, match!.text);
				});
			}
		}

		await LSPUtils.assembler.languageHelper.documentChange.WatchFileUpdate(event.document.getText(), event.document.uri.fsPath);
		let diagnostic = LSPUtils.assembler.languageHelper.documentChange.GetDiagnostics();
		UpdateFile.errorCollection.clear();
		diagnostic.forEach((msgs, filePath) => {
			let uri = vscode.Uri.file(filePath);
			let dias: vscode.Diagnostic[] = [];
			for (let i = 0; i < msgs.length; ++i) {
				const msg = msgs[i];
				let range = new vscode.Range(msg.line, msg.start, msg.line, msg.start + msg.length);
				dias.push(new vscode.Diagnostic(range, msg.message));
			}
			UpdateFile.errorCollection.set(uri, dias);
		});
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