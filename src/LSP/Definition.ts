import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class Definition {

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerDefinitionProvider(
				LSPUtils.assembler.config.FileExtension,
				{ provideDefinition: Definition.Definition }
			)
		);
	}

	/**
	 * 跳转到某个文件某行
	 * @param file 文件
	 * @param line 行号
	 * @param start 起始位置
	 * @param length 长度
	 */
	static async GotoLocation(file: string, line: number, start: number, length: number) {
		const uri = vscode.Uri.file(file);
		const document = await vscode.workspace.openTextDocument(uri)
		await vscode.window.showTextDocument(document, { selection: new vscode.Range(line, start, line, start + length) });
	}

	private static async Definition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		await LSPUtils.WaitingCompileFinished();

		const result: vscode.Location[] = [];

		const lineText = document.lineAt(position.line).text;
		const temp = LSPUtils.assembler.languageHelper.definition.GetDefinitionPosition(
			document.uri.fsPath,
			lineText, position.line,
			position.character
		);

		if (!temp || !temp.filePath)
			return result;

		const fileUri = vscode.Uri.file(temp.filePath);
		const filePos = new vscode.Range(temp.line, temp.start, temp.line, temp.start + temp.length);
		const location = new vscode.Location(fileUri, filePos);
		result.push(location);

		return result;
	}

}