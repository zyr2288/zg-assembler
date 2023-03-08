import * as vscode from "vscode";
import { ConfigUtils } from "./ConfigUtils";
import { LSPUtils } from "./LSPUtils";

const FreshTime = 1000;

/**更新文件的自动大写以及监视文件改动更新 Label以及错误等 */
export class UpdateFile {

	private static fileUpdateThreadId: NodeJS.Timer;
	private static updateFiles = new Map<string, string>();
	private static errorCollection: vscode.DiagnosticCollection;

	static async Initialize() {
		UpdateFile.errorCollection ??= vscode.languages.createDiagnosticCollection(LSPUtils.assembler.config.FileExtension.language);

		vscode.workspace.onDidChangeTextDocument(UpdateFile.ChangeDocument);
		UpdateFile.WatchFile();
	}

	/**载入所有工程文件 */
	static async LoadAllFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		let files = await LSPUtils.GetWorkspaceFilterFile();

		let tempFiles: { text: string, filePath: string }[] = [];
		for (let i = 0; i < files.length; ++i) {
			let buffer = await LSPUtils.assembler.fileUtils.ReadFile(files[i].fsPath);
			let text = LSPUtils.assembler.fileUtils.BytesToString(buffer);
			tempFiles.push({ text, filePath: files[i].fsPath });
		}

		await LSPUtils.assembler.compiler.DecodeText(tempFiles);
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

		UpdateFile.updateFiles.set(event.document.uri.fsPath, event.document.getText());

		LSPUtils.fileUpdateFinished = false;
		clearTimeout(UpdateFile.fileUpdateThreadId);
		UpdateFile.fileUpdateThreadId = setTimeout(async () => {
			let files: { text: string, filePath: string }[] = [];
			UpdateFile.updateFiles.forEach((text, filePath) => {
				files.push({ text, filePath });
			});
			await LSPUtils.assembler.compiler.DecodeText(files);
			UpdateFile.UpdateDiagnostic();
			UpdateFile.updateFiles.clear();
			LSPUtils.fileUpdateFinished = true;
		}, FreshTime);

	}

	/**更新错误 */
	static UpdateDiagnostic() {
		let errors = LSPUtils.assembler.diagnostic.GetExceptions();
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

		if (LSPUtils.assembler.config.ProjectSetting.outOfRangeWarning) {
			errors = LSPUtils.assembler.diagnostic.GetWarnings();
			for (let i = 0; i < errors.length; ++i) {
				const warning = errors[i];
				let diagnostic = result.get(warning.filePath);
				if (!diagnostic) {
					diagnostic = [];
					result.set(warning.filePath, diagnostic);
				}

				if (warning.line < 0)
					continue;

				let range = new vscode.Range(warning.line, warning.start, warning.line, warning.start + warning.length);
				diagnostic.push(new vscode.Diagnostic(range, warning.message, vscode.DiagnosticSeverity.Warning));
			}
		}

		result.forEach((value, key, map) => {
			let uri = vscode.Uri.file(key);
			this.errorCollection.set(uri, value);
		});
	}

	//#region 监视文件
	/**监视文件，改动等 */
	private static WatchFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		let rp = new vscode.RelativePattern(
			vscode.workspace.workspaceFolders![0],
			`{**/*.${LSPUtils.assembler.config.FileExtension.extension},.vscode/${LSPUtils.assembler.config.ConfigFile}}`
		);

		const watcher = vscode.workspace.createFileSystemWatcher(rp, false, false, false);
		watcher.onDidDelete(UpdateFile.FileDelete);
		watcher.onDidChange(UpdateFile.FileChange);
		watcher.onDidCreate(UpdateFile.FileCreate);
	}

	/**文件删除 */
	private static async FileDelete(e: vscode.Uri) {
		if (await LSPUtils.assembler.fileUtils.GetFileName(e.fsPath) === LSPUtils.assembler.config.ConfigFile)
			return;

		LSPUtils.assembler.ClearFile(e.fsPath);
		UpdateFile.errorCollection.delete(e);
		console.log("delete file", e);
		
	}

	/**文件修改 */
	private static async FileChange(e: vscode.Uri) {
		console.log("change file", e);
		let fileName = await LSPUtils.assembler.fileUtils.GetFileName(e.fsPath);
		if (fileName !== LSPUtils.assembler.config.ConfigFile)
			return;

		let platform = LSPUtils.assembler.config.ProjectSetting.platform;
		await ConfigUtils.ReadConfig();
		if (platform === LSPUtils.assembler.config.ProjectSetting.platform)
			return;

		LSPUtils.assembler.platform.ChangePlatform(LSPUtils.assembler.config.ProjectSetting.platform);
	}

	/**文件创建 */
	private static async FileCreate(e: vscode.Uri) {
		let tempFiles = (await UpdateFile.GetWorkspaceFilterFile()).map(value => value.fsPath);
		if (tempFiles.includes(e.fsPath)) {
			LSPUtils.fileUpdateFinished = false;
			let buffer = await LSPUtils.assembler.fileUtils.ReadFile(e.fsPath);
			let text = LSPUtils.assembler.fileUtils.BytesToString(buffer);
			await LSPUtils.assembler.compiler.DecodeText([{ text, filePath: e.fsPath }]);
			LSPUtils.fileUpdateFinished = true;
		}
		console.log("create file", e);
	}
	//#endregion 监视文件

	//#region 获取工作目录下所筛选出的文件
	private static async GetWorkspaceFilterFile() {
		let includes = `{${LSPUtils.assembler.config.ProjectSetting.includes.join(",")}}`;
		let excludes: string | null = null;
		if (LSPUtils.assembler.config.ProjectSetting.excludes.length != 0)
			excludes = `{${LSPUtils.assembler.config.ProjectSetting.excludes.join(",")}}`;

		return await vscode.workspace.findFiles(includes, excludes);
	}

	/**查询文件是否在工程内 */
	// private static async FindFileInProject(file: string) {
	// 	let files = await this.GetWorkspaceFilterFile();
	// 	let searchFiles = files.map(value => value.fsPath);
	// 	return searchFiles.includes(file);
	// }
	//#endregion 获取工作目录下所筛选出的文件
}