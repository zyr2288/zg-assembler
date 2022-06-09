import { Assembler } from "./core/Assembler";
import * as vscode from "vscode";
import { TextDecoder, TextEncoder } from "util";
import { BaseLineType } from "./core/BaseLine/BaseLine";
import { Completion, CompletionType } from "./core/Base/Completion";

enum HightlightType { function, keyword, enumMember, struct, variable, operator }
enum TokenType { None, Label, Variable, Defined, Macro, Keyword }

export class Helper {

	/**文本刷新时间 */
	private readonly freashTime = 1000;

	private updateFiles: vscode.TextDocumentChangeEvent[] = [];
	private assembler = new Assembler();
	private freashTreadId?: NodeJS.Timeout;
	private errorCollection = vscode.languages.createDiagnosticCollection(this.assembler.config.FileExtension.language);
	private fileUpdateFinished = false;
	private statusBarItem?: vscode.StatusBarItem;
	private leagend!: vscode.SemanticTokensLegend;

	/**初始化 */
	async Initialize() {
		let temp: string[] = [];
		for (let key in HightlightType) temp.push(key);
		temp.splice(0, temp.length / 2);
		this.leagend = new vscode.SemanticTokensLegend(temp);

		this.FileUtilsRewrite();
		await this.ReadConfig();

		this.assembler.baseHelper.Initialize();

		this.DocumentChange();
		this.DefinitionProvider();
		this.HoverProvider();
		this.ProvideDocumentSemanticTokens();
		this.Intellisense();

		this.fileUpdateFinished = false;
		await this.LoadAllFile();
		this.UpdateDiagnostic();
		this.fileUpdateFinished = true;

		this.RegisterMyCommand();
	}

	/***** 辅助方法 *****/

	//#region 文档修改时的自动大写以及重新监测
	/**文档修改时的自动大写以及重新监测 */
	private DocumentChange() {
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
					if (this.AutoUppercase(match, lineNumber))
						return;
				}
			});

			let index = this.updateFiles.findIndex((value) => {
				return value.document.uri.fsPath == event.document.uri.fsPath;
			});
			if (index < 0)
				this.updateFiles.push(event);

			this.fileUpdateFinished = false;
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
				this.fileUpdateFinished = true;
			}, this.freashTime);
		});
	}

	private AutoUppercase(match: RegExpExecArray | null, lineNumber: number) {
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
	//#endregion 文档修改时的自动大写以及重新监测

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

	//#region 查找标签定义位置
	/**查找标签定义位置 */
	private DefinitionProvider() {
		vscode.languages.registerDefinitionProvider(this.assembler.config.FileExtension, {
			provideDefinition: async (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) => {
				let result: vscode.Location[] = [];

				let text = document.lineAt(position.line);
				let temp = await this.assembler.baseHelper.GetLabelSourcePosition(text.text, position.character, position.line, document.uri.fsPath);

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

	//#region 鼠标停留时获取的注释标签等
	/**鼠标停留时获取的注释标签等 */
	private HoverProvider() {
		vscode.languages.registerHoverProvider(this.assembler.config.FileExtension, {
			provideHover: (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) => {
				let result: vscode.MarkdownString[] = [];

				let text = document.lineAt(position.line);
				let temp = this.assembler.baseHelper.GetLabelCommentAndValue(text.text, position.character, position.line, document.uri.fsPath);

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
	//#endregion 鼠标停留时获取的注释标签等

	//#region 初始化载入所有文件
	/**初始化载入所有文件 */
	private async LoadAllFile() {
		if (!vscode.workspace.workspaceFolders)
			return;

		// let files = await this.GetWorkspaceFilterFile();
		let files = await vscode.workspace.findFiles("{**/*.asm}", null);

		let tempFiles: { text: string, filePath: string }[] = [];
		for (let i = 0; i < files.length; i++) {
			let buffer = await this.assembler.fileUtils.ReadFile(files[i].fsPath);
			let text = this.assembler.fileUtils.BytesToString(buffer);
			tempFiles.push({ text, filePath: files[i].fsPath });
		}
		await this.assembler.compile.DecodeText(tempFiles);
	}
	//#endregion 初始化载入所有文件

	//#region 自定义高亮
	/**自定义高亮 */
	private ProvideDocumentSemanticTokens() {
		vscode.languages.registerDocumentSemanticTokensProvider(this.assembler.config.FileExtension, {
			provideDocumentSemanticTokens: async (document: vscode.TextDocument, token: vscode.CancellationToken) => {
				const tokenBuilder = new vscode.SemanticTokensBuilder(this.leagend);
				await this.WaitTextUpdate();
				try {
					let allLines = this.assembler.baseHelper.GetUpdateLine(document.fileName);
					for (let i = 0; i < allLines.length; i++) {
						const line = allLines[i];
						if (line.lineType == BaseLineType.Unknow)
							continue;

						let tokens = line.GetToken();
						for (let j = 0; j < tokens.length; j++) {
							const token = tokens[j];
							switch (token.type) {
								case TokenType.Keyword:
									tokenBuilder.push(token.lineNumber, token.startColumn, token.text.length, HightlightType.keyword);
									break;
								case TokenType.Defined:
									tokenBuilder.push(token.lineNumber, token.startColumn, token.text.length, HightlightType.enumMember);
									break;
								case TokenType.Label:
									tokenBuilder.push(token.lineNumber, token.startColumn, token.text.length, HightlightType.struct);
									break;
								case TokenType.Macro:
									tokenBuilder.push(token.lineNumber, token.startColumn, token.text.length, HightlightType.function);
									break;
							}
						}
					}
				} catch (e) {
					console.log(e);
				}
				return tokenBuilder.build();
			}
		}, this.leagend)

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

	//#region 更新错误
	/**更新错误 */
	UpdateDiagnostic() {
		let errors = this.assembler.myException.GetAllException();
		this.errorCollection.clear();
		let result: Record<string, vscode.Diagnostic[]> = {};
		for (let i = 0; i < errors.length; i++) {
			const error = errors[i];
			if (!result[error.filePath])
				result[error.filePath] = [];

			if (error.line < 0)
				continue;

			let range = new vscode.Range(error.line, error.start, error.line, error.start + error.length);
			result[error.filePath].push(new vscode.Diagnostic(range, error.message));
		}
		for (let key in result) {
			if (key == "undefined")
				continue;

			let uri = vscode.Uri.file(key);
			this.errorCollection.set(uri, result[key]);
		}
	}
	//#endregion 更新错误

	//#region 等待文本更新
	private async WaitTextUpdate() {
		return new Promise((resolve, rejects) => {
			let temp = setInterval(() => {
				if (this.fileUpdateFinished) {
					clearInterval(temp);
					resolve("");
				}
			}, 200);
		})
	}
	//#endregion 等待文本更新


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

	/***** Private *****/

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
			case CompletionType.Label:
				result.kind = vscode.CompletionItemKind.Variable;
				break;
			case CompletionType.MacroLabel:
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
}