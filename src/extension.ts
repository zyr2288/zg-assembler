// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { LanguageServer } from './LSP/LanguageServer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// // Use the console to output diagnostic information (console.log) and errors (console.error)
	// // This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "test" is now active!');

	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with registerCommand
	// // The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('test.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from test!');
	// 	Platform.ChangePlatform("6502");

	// 	let document = vscode.window.activeTextEditor!.document;
	// 	Compiler.DecodeText([{ text: document.getText(), filePath: document.uri.fsPath }]);
	// 	// PeggyTest.Test(text);

	// });

	// context.subscriptions.push(disposable);

	try {
		var server = new LanguageServer();
		await server.Initialize(context);
	} catch (e) {
		console.log(e);
		throw e;
	}

	// server.SetLanguage()

}

// this method is called when your extension is deactivated
export function deactivate() { }
