import { Assembler } from "./core/Assembler";
import * as vscode from "vscode";
import { Completion, CompletionType } from "./core/Base/Completion";
import { TextDecoder, TextEncoder } from "util";

/**帮助的基本类，仅此类与编译器有关联 */
export class Helper {

	updateFiles: vscode.TextDocumentChangeEvent[] = [];
	private readonly freashTime = 1000;

	private statusBarItem?: vscode.StatusBarItem;

	private freashTreadId?: NodeJS.Timeout;
	private assembler = new Assembler();
	private errorCollection = vscode.languages.createDiagnosticCollection(this.assembler.config.FileExtension.language);

	private leagend = new vscode.SemanticTokensLegend(["class", "keyword"]);

	//#region 初始化
	/**初始化 */
	async Initialize() {
		this.FileUtilsRewrite();

		await this.ReadConfig();
		this.assembler.baseHelper.SwitchPlatform(this.assembler.config.ProjectSetting.platform);

		this.Intellisense();
		this.ProvideFoldingRanges();
		this.DocumentChange();
		this.DefinitionProvider();
		this.HoverProvider();
		this.ProvideDocumentSemanticTokens();

		this.RegisterMyCommand();
		this.WatchFile();

		await this.LoadAllFile();

		// vscode.env.clipboard.writeText(this.assembler.GetKeyword());
	}
	//#endregion 初始化

	//#region 重写编译器的文件操作接口
	/**重写编译器的文件操作接口 */
	private FileUtilsRewrite() {

		this.assembler.fileUtils.ReadFile = async (filePath: string) => {
			let uri = vscode.Uri.file(filePath);
			let result = await vscode.workspace.fs.readFile(uri);
			return result;
		}

		this.assembler.fileUtils.PathType = async (filePath: string) => {
			let uri = vscode.Uri.file(filePath);
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

		this.assembler.fileUtils.SaveFile = async (filePath: string, data: Uint8Array) => {
			let uri = vscode.Uri.file(filePath);
			await vscode.workspace.fs.writeFile(uri, data);
		}

		this.assembler.fileUtils.BytesToString = (data: Uint8Array) => {
			let decoder = new TextDecoder();
			return decoder.decode(data);
		}

		this.assembler.fileUtils.StringToBytes = (text: string) => {
			let encoder = new TextEncoder();
			return encoder.encode(text);
		}

		this.assembler.fileUtils.Combine = (...paths: string[]) => {
			if (paths.length == 0)
				return "";

			let uri = vscode.Uri.file(paths[0]);
			if (paths.length == 1)
				return uri.fsPath;

			paths.splice(0, 1);
			uri = vscode.Uri.joinPath(uri, ...paths);
			return uri.fsPath;
		}

		this.assembler.fileUtils.GetFolderFiles = async (path: string) => {
			path = await this.assembler.fileUtils.GetPathFolder(path);
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
	}
	//#endregion 重写编译器的文件操作接口

	//#region 绑定设置折叠信息
	/**
	 * 设置折叠信息
	 */
	ProvideFoldingRanges() {
		vscode.languages.registerFoldingRangeProvider(this.assembler.config.FileExtension, {
			provideFoldingRanges: (document: vscode.TextDocument,
				context: vscode.FoldingContext,
				token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> => {
				let result = this.assembler.baseHelper.ProvideFolding(document.getText());
				return result;
			}
		})
	}
	//#endregion 绑定设置折叠信息

	//#region 文本修改
	/**文本修改 */
	DocumentChange() {
		vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
			if (event.document.languageId != this.assembler.config.FileExtension.language)
				return;

			let total = event.contentChanges.length - 1;
			event.contentChanges.forEach((value) => {
				if (value.text.includes("\n")) {
					let lineNumber = value.range.start.line + total;
					total--;
					let content = event.document.lineAt(lineNumber).text;
					let match = this.assembler.baseHelper.uppercaseRegex.exec(content);
					if (Helper.AutoUppercase(match, lineNumber))
						return;
				}
			});

			let index = this.updateFiles.findIndex((value) => {
				return value.document.uri.fsPath == event.document.uri.fsPath;
			});
			if (index < 0)
				this.updateFiles.push(event);

			if (this.freashTreadId)
				clearTimeout(this.freashTreadId);

			this.freashTreadId = setTimeout(async () => {
				let files: { text: string, filePath: string }[] = [];
				this.updateFiles.forEach(async value => {
					let text = value.document.getText();
					files.push({ text, filePath: value.document.uri.fsPath });
				});
				await this.assembler.compile.DecodeText(files);
				this.UpdateDiagnostic();
				this.updateFiles = [];
			}, this.freashTime);
		});
	}

	private static AutoUppercase(match: RegExpExecArray | null, lineNumber: number) {
		if (match == null)
			return false;

		let range = new vscode.Range(lineNumber, match.index, lineNumber, match.index + match[0].length);
		let editor = <vscode.TextEditor>vscode.window.activeTextEditor;
		editor.edit((ee) => {
			// @ts-ignore 目前只能替换一个，原因未知
			ee.replace(range, match[0].toUpperCase());
		});
		return true;
	}
	//#endregion 文本修改

	//#region 绑定智能提示
	/**绑定智能提示 */
	Intellisense() {
		vscode.languages.registerCompletionItemProvider(this.assembler.config.FileExtension, {
			provideCompletionItems: async (document: vscode.TextDocument,
				position: vscode.Position,
				token: vscode.CancellationToken,
				context: vscode.CompletionContext): Promise<vscode.CompletionItem[]> => {

				if (!this.assembler.config.ProjectSetting.intellisense)
					return [];

				let doc = {
					fileHash: this.assembler.utils.GetHashcode(document.fileName),
					lineNumber: position.line,
					allText: document.getText(),
					currect: document.offsetAt(position),
					lineText: document.lineAt(position.line).text,
					lineCurrect: position.character
				};
				let option = { trigger: context.triggerCharacter };

				let coms = await this.assembler.baseHelper.Intellisense(doc, option);

				let result: vscode.CompletionItem[] = [];
				coms.forEach(value => result.push(this.ConvertCompletion(value)));
				return result;
			}
		}, ".", ":");
	}
	//#endregion 绑定智能提示

	//#region 监视文件
	/**监视文件，改动等 */
	WatchFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		let rp = new vscode.RelativePattern(
			vscode.workspace.workspaceFolders![0],
			`{**/*.${this.assembler.config.FileExtension.extension},${this.assembler.config.ConfigFile}}`
		);

		let watcher = vscode.workspace.createFileSystemWatcher(rp, false, false, false);

		watcher.onDidDelete(async (e) => {
			if (e.fsPath == this.assembler.config.ConfigFile)
				return;

			this.assembler.baseHelper.ClearFile(e.fsPath);
			let uri = vscode.Uri.file(e.fsPath);
			this.errorCollection.delete(uri);
		});

		watcher.onDidChange(async (e) => {
			let path = await this.assembler.fileUtils.GetFileName(e.fsPath);
			if (path == this.assembler.config.ConfigFile) {
				let data = await this.assembler.fileUtils.ReadFile(e.fsPath);
				let json = this.assembler.fileUtils.BytesToString(data);

				let platform = this.assembler.config.ProjectSetting.platform;
				this.assembler.config.ReadConfigJson(json);
				if (platform == this.assembler.config.ProjectSetting.platform)
					return;

				this.assembler.baseHelper.SwitchPlatform(this.assembler.config.ProjectSetting.platform);
			}
		});

		watcher.onDidCreate(async (e) => {
			let tempFiles = await this.GetWorkspaceFilterFile();
			let searchFiles = tempFiles.map(value => value.fsPath);
			if (searchFiles.includes(e.fsPath)) {
				let buffer = await this.assembler.fileUtils.ReadFile(e.fsPath);
				let text = this.assembler.fileUtils.BytesToString(buffer);
				await this.assembler.compile.DecodeText([{ text, filePath: e.fsPath }]);
			}
		});
	}

	//#endregion 监视文件

	//#region 更新错误
	/**更新错误 */
	UpdateDiagnostic() {
		let errors = this.assembler.myException.GetAllException();
		this.errorCollection.clear();
		let result: { [key: string]: vscode.Diagnostic[] } = {};
		for (let i = 0; i < errors.length; i++) {
			const error = errors[i];
			if (!result[error.filePath])
				result[error.filePath] = [];

			let range = new vscode.Range(error.line, error.start, error.line, error.start + error.length);
			result[error.filePath].push(new vscode.Diagnostic(range, error.message));
		}
		for (let key in result) {
			let uri = vscode.Uri.file(key);
			this.errorCollection.set(uri, result[key]);
		}
	}
	//#endregion 更新错误

	//#region 查找标签定义位置
	/**查找标签定义位置 */
	DefinitionProvider() {
		vscode.languages.registerDefinitionProvider(this.assembler.config.FileExtension, {
			provideDefinition: async (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) => {
				let result: vscode.Location[] = [];

				let text = document.lineAt(position.line);
				let temp = await this.assembler.baseHelper.GetLebalSourcePosition(text.text, position.character, position.line, document.uri.fsPath);

				if (temp.filePath.trim() != "") {
					let fileUri = vscode.Uri.file(temp.filePath);
					let filePos = new vscode.Range(temp.lineNumber, temp.startColumn, temp.lineNumber, temp.startColumn + temp.length);
					let location = new vscode.Location(fileUri, filePos);
					result.push(location);
				}

				return result;
			}
		})
	}
	//#endregion 查找标签定义位置

	//#region 获取标签注释
	/**获取标签注释 */
	HoverProvider() {
		vscode.languages.registerHoverProvider(this.assembler.config.FileExtension, {
			provideHover: (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) => {
				let result: vscode.MarkdownString[] = [];

				let text = document.lineAt(position.line);
				let temp = this.assembler.baseHelper.GetLebalCommentAndValue(text.text, position.character, position.line, document.uri.fsPath);

				if (temp.comment) {
					result.push(new vscode.MarkdownString(`**${temp.comment}**`));
				}

				if (temp.value != undefined) {
					let temp2 = this.assembler.utils.ConvertValue(temp.value);
					result.push(new vscode.MarkdownString(`HEX: $${temp2.hex}`));
					result.push(new vscode.MarkdownString(`DEC: ${temp2.dec}`));
					result.push(new vscode.MarkdownString(`BIN: @${temp2.bin}`));
				}

				return new vscode.Hover(result);
			}
		})
	}
	//#endregion 获取标签注释

	//#region 初始化载入所有文件
	/**初始化载入所有文件 */
	async LoadAllFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		await this.ReadConfig();

		let files = await this.GetWorkspaceFilterFile();

		let tempFiles: { text: string, filePath: string }[] = [];
		for (let i = 0; i < files.length; i++) {
			let buffer = await this.assembler.fileUtils.ReadFile(files[i].fsPath);
			let text = this.assembler.fileUtils.BytesToString(buffer);
			tempFiles.push({ text, filePath: files[i].fsPath });
		}
		await this.assembler.compile.DecodeText(tempFiles);
		this.UpdateDiagnostic();
	}
	//#endregion 初始化载入所有文件

	//#region 自定义高亮
	/**自定义高亮 */
	ProvideDocumentSemanticTokens() {
		vscode.languages.registerDocumentSemanticTokensProvider(this.assembler.config.FileExtension, {
			provideDocumentSemanticTokens: (document: vscode.TextDocument, token: vscode.CancellationToken) => {
				const tokenBuilder = new vscode.SemanticTokensBuilder(this.leagend);
				let allLines = document.getText().split(/\r?\n/g);
				for (let i = 0; i < allLines.length; i++) {
					let text = allLines[i].split(";")[0];

					let instructions = this.assembler.GetInstrctionsRegex();
					let matches = this.assembler.utils.GetTextMatches(instructions, text);
					if (matches.length != 0) {
						tokenBuilder.push(i, matches[0].index, matches[0].match.length, 1);
						continue;
					}

					let macroDefined = /\.MACRO\s+.*?(\s+|$)/ig.exec(text);
					if (macroDefined) {
						tokenBuilder.push(i, macroDefined.index + 6, macroDefined[0].length - 6, 0);
						continue;
					}

					let macro = this.assembler.GetMacroMatch(text);
					if (macro) {
						tokenBuilder.push(i, macro.index, macro[0].length, 0);
						continue;
					}

				}
				return tokenBuilder.build();
			}
		}, new vscode.SemanticTokensLegend(["class", "keyword"]))

	}
	//#endregion 自定义高亮

	//#region 绑定命令
	private RegisterMyCommand() {

		//#region 编译本文件
		vscode.commands.registerTextEditorCommand(this.assembler.config.ExtensionCommandNames.CompliteThis, async () => {
			if (!vscode.window.activeTextEditor)
				return;

			this.StatueBarShowText(`$(sync~spin) 编译中...`);

			await this.ReadConfig();

			let text = vscode.window.activeTextEditor.document.getText();
			let filePath = vscode.window.activeTextEditor.document.uri.fsPath;

			let result = await this.assembler.compile.CompileText(text, filePath);
			this.UpdateDiagnostic();

			await this.OutputResult(result!, {
				toFile: this.assembler.config.ProjectSetting.outputSingleFile,
				copy: this.assembler.config.ProjectSetting.copyToClipboard,
				patchFile: this.assembler.config.ProjectSetting.patchFile
			});

			let showText = this.assembler.myException.isError ? ` $(alert) 编译有错误` : ` $(check) 编译完成`;
			this.StatueBarShowText(showText, 3000);
		});
		//#endregion 编译本文件

		//#region 编译主文件
		vscode.commands.registerTextEditorCommand(this.assembler.config.ExtensionCommandNames.CompliteMain, async () => {
			if (!vscode.workspace.workspaceFolders)
				return;

			this.StatueBarShowText(`$(sync~spin) 编译中...`);

			await this.ReadConfig();

			let filePath = this.assembler.fileUtils.Combine(vscode.workspace.workspaceFolders[0].uri.fsPath, this.assembler.config.ProjectSetting.entry);
			let buffer = await this.assembler.fileUtils.ReadFile(filePath);
			let text = this.assembler.fileUtils.BytesToString(buffer);

			let result = await this.assembler.compile.CompileText(text, filePath);
			this.UpdateDiagnostic();

			await this.OutputResult(result!, {
				toFile: this.assembler.config.ProjectSetting.outputEntryFile,
				copy: this.assembler.config.ProjectSetting.copyToClipboard,
				patchFile: this.assembler.config.ProjectSetting.patchFile
			});

			let showText = this.assembler.myException.isError ? ` $(alert) 编译有错误` : ` $(check) 编译完成`;
			this.StatueBarShowText(showText, 3000);
		});
		//#endregion 编译主文件

		//#region 查找路径命令
		vscode.commands.registerTextEditorCommand(this.assembler.config.ExtensionCommandNames.GetThisFilePath, async (textEditor, edit, ...args: any[]) => {
			// 参数0 INCLUDE 或 INCBIN
			// 参数1 空则是第一次执行
			if (args[0] != ".INCLUDE" && args[0] != ".INCBIN")
				return;

			let filePath = args[1] ?? textEditor.document.fileName;
			this.assembler.baseHelper.FileCompletion = {
				type: args[0],
				path: filePath,
				workFolder: vscode.workspace.workspaceFolders![0].uri.fsPath,
				excludeFile: textEditor.document.fileName
			};
			vscode.commands.executeCommand("editor.action.triggerSuggest");
		});
		//#endregion 查找路径命令

	}
	//#endregion 绑定命令

	/***** 辅助功能 ******/

	//#region 更改显示语言
	ChangeDisplayLanguage() {
		let config: { locale: "zh-cn" | "en", availableLanguages: any } = JSON.parse(<string>process.env.VSCODE_NLS_CONFIG);
		this.assembler.baseHelper.ChangeDisplayLanguage(config.locale);
	}
	//#endregion 更改显示语言

	//#region 转换Completion成vscode.CompletionItem
	/**转换Completion成vscode.CompletionItem */
	private ConvertCompletion(completion: Completion) {
		let result = new vscode.CompletionItem(completion.showText);
		result.insertText = completion.insertText;
		result.detail = completion.comment;
		result.sortText = completion.index.toString();

		switch (completion.type) {
			case CompletionType.Instruction:
				result.kind = vscode.CompletionItemKind.Keyword;
				break;
			case CompletionType.Command:
				result.kind = vscode.CompletionItemKind.Function;
				result.insertText = result.insertText.substring(1);
				break;
			case CompletionType.Macro:
				result.kind = vscode.CompletionItemKind.Field;
				break;
			case CompletionType.Lebal:
				result.kind = vscode.CompletionItemKind.Variable;
				break;
			case CompletionType.MacroLebal:
				result.kind = vscode.CompletionItemKind.Field;
				break;
			case CompletionType.Folder:
				result.kind = vscode.CompletionItemKind.Folder;
				result.command = {
					title: "运行路径智能提示",
					command: this.assembler.config.ExtensionCommandNames.GetThisFilePath,
					arguments: [...completion.tag]
				}
				break;
			case CompletionType.File:
				result.kind = vscode.CompletionItemKind.File;
				break;
		}

		if (result.label == ".INCLUDE" || result.label == ".INCBIN") {
			result.insertText = new vscode.SnippetString(result.insertText + "\"${0:}\"");
			result.command = {
				title: "运行相对路径智能提示",
				command: this.assembler.config.ExtensionCommandNames.GetThisFilePath,
				arguments: [result.label]
			}
		}

		return result;
	}
	//#endregion 转换Completion成vscode.CompletionItem

	//#region 状态栏显示文本
	StatueBarShowText(text: string, timer: number = 0) {
		if (!this.statusBarItem)
			this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

		this.statusBarItem.text = text;
		this.statusBarItem.show();

		if (timer > 0)
			setTimeout(() => { this.statusBarItem?.hide(); }, timer);
	}
	//#endregion 状态栏显示文本

	//#region 读取配置文件
	async ReadConfig() {
		let settingFile = this.assembler.fileUtils.Combine(vscode.workspace.workspaceFolders![0].uri.fsPath, ".vscode", "project-settings.json");
		if (await this.assembler.fileUtils.PathType(settingFile) != "file") {
			let json = JSON.stringify(this.assembler.config.ProjectDefaultSetting);
			let buffer = this.assembler.fileUtils.StringToBytes(json);
			await this.assembler.fileUtils.SaveFile(settingFile, buffer);
		} else {
			let buffer = await this.assembler.fileUtils.ReadFile(settingFile);
			let json = this.assembler.fileUtils.BytesToString(buffer);
			this.assembler.config.ReadConfigJson(json);
		}
	}
	//#endregion 读取配置文件

	//#region 输出结果
	async OutputResult(result: number[], option?: { toFile?: string, copy?: boolean, patchFile?: string }) {
		let buffer = this.assembler.compile.GetAllBaseLineBytes(result);

		if (option?.toFile) {
			if (!vscode.workspace.workspaceFolders)
				return;

			let filePath = this.assembler.fileUtils.Combine(vscode.workspace.workspaceFolders[0].uri.fsPath, option.toFile);
			this.assembler.fileUtils.SaveFile(filePath, buffer);
		}

		if (option?.copy) {
			let temp = this.assembler.compile.GetResultString(result);
			vscode.env.clipboard.writeText(temp);
		}

		if (option?.patchFile) {
			if (!vscode.workspace.workspaceFolders)
				return;

			let filePath = this.assembler.fileUtils.Combine(vscode.workspace.workspaceFolders[0].uri.fsPath, option.patchFile);
			if (await this.assembler.fileUtils.PathType(filePath) != "file")
				return;

			let fileBuffer = await this.assembler.fileUtils.ReadFile(filePath);
			for (let i = 0; i < result.length; i++) {
				if (result[i] == undefined)
					continue;

				fileBuffer[i] = result[i];
			}
		}
	}
	//#endregion 输出结果

	//#region 获取工作目录下所筛选出的文件
	private async GetWorkspaceFilterFile() {
		let includes = `{${this.assembler.config.ProjectSetting.includes.join(",")}}`;
		let excludes: string | null = null;
		if (this.assembler.config.ProjectSetting.excludes.length != 0)
			excludes = `{${this.assembler.config.ProjectSetting.excludes.join(",")}}`;
			
		return await vscode.workspace.findFiles(includes, excludes);
	}
	//#endregion

}