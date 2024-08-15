// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { LanguageServer } from "./LSP/LanguageServer";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// let editor = vscode.window.activeTextEditor;
	// if (!editor)
	// 	return;

	// let assembler = new ZGAsseembler();
	// assembler.SwitchPlatform("6502");

	// let text = editor.document.getText();
	// assembler.ParseText(text, editor.document.uri.fsPath);
	try {
		const server = new LanguageServer();
		await server.Initialize(context);
	} catch (e) {
		console.error(e);
		throw e;
	}

}

// This method is called when your extension is deactivated
export async function deactivate() { }
