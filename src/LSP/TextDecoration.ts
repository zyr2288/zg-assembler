import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class TextDecoration {

	private static decoration: vscode.TextEditorDecorationType;

	/**初始化 */
	static Initialize(context: vscode.ExtensionContext) {
		const myColor = new vscode.ThemeColor("disabledForeground");
		TextDecoration.decoration = vscode.window.createTextEditorDecorationType({
			after: { margin: "0 0 0 5rem", color: myColor },
			rangeBehavior: vscode.DecorationRangeBehavior.OpenOpen
		});

		context.subscriptions.push(
			vscode.window.onDidChangeTextEditorSelection(TextDecoration.ShowLineResult)
		);
	}

	private static ShowLineResult(event: vscode.TextEditorSelectionChangeEvent) {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		const line = editor.selection.active.line;
		const result = LSPUtils.assembler.languageHelper.debug.GetDebugLineWithFile(editor.document.fileName, line);
		if (!result) {
			editor.setDecorations(TextDecoration.decoration, []);
			return;
		}

		let contentText = "";
		for (let i = 0; i < result.line.lineResult.result.length; i++) {
			const value = result.line.lineResult.result[i];
			const temp = value.toString(16).toUpperCase().padStart(2, "0");
			contentText += temp + " ";
		}
		contentText = contentText.substring(0, contentText.length - 1);

		const baseAddress = "0x" + result.baseAddress.toString(16).toUpperCase();
		const orgAddress = "0x" + result.line.lineResult.address.org.toString(16).toUpperCase();

		contentText = LSPUtils.assembler.localization.GetMessage("baseOrgResult", baseAddress, orgAddress, contentText);
		const end = editor.document.lineAt(line).range.end.character;
		const option: vscode.DecorationOptions = {
			range: editor.document.validateRange(new vscode.Range(line, end, line, end)),
			renderOptions: { after: { contentText } }
		}

		editor.setDecorations(TextDecoration.decoration, [option]);
	}
}