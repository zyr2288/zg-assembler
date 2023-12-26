import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class TextDecoration {

	private static decoration: vscode.TextEditorDecorationType;

	/**初始化 */
	static Initialize(context: vscode.ExtensionContext) {
		const myColor = new vscode.ThemeColor("disabledForeground");
		TextDecoration.decoration = vscode.window.createTextEditorDecorationType({
			after: { margin: "0 0 0 10rem", color: myColor },
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

		const result = LSPUtils.assembler.languageHelper.lineResult.GetLineResult(editor.document.fileName, line);
		if (!result) {
			editor.setDecorations(TextDecoration.decoration, []);
			return;
		}

		const end = editor.document.lineAt(line).range.end.character;
		const option: vscode.DecorationOptions = {
			range: editor.document.validateRange(new vscode.Range(line, end, line, end)),
			renderOptions: { after: { contentText: result } }
		}

		editor.setDecorations(TextDecoration.decoration, [option]);
	}
}