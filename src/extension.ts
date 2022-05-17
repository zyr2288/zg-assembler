// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Helper } from './Helper';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	let statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBarItem.text = ` $(sync~spin) 正在载入汇编插件`;
	statusBarItem.show();

	let helper = new Helper();
	helper.ChangeDisplayLanguage();
	try {
		await helper.Initialize();
	} catch(e) {
		console.log(e);
	}

	statusBarItem.text = ` $(check) 载入完成`;
	setTimeout(() => { statusBarItem.hide(); }, 1000);
}

// this method is called when your extension is deactivated
export async function deactivate() { }
