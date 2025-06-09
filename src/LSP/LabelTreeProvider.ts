import * as vscode from "vscode";

export class LabelTreeProvider implements vscode.TreeDataProvider<any> {

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.commands.registerCommand("zg-assembler.labelTreeRefresh", () => {
				console.log("refresh");
			})
		);
		context.subscriptions.push(
			vscode.window.registerTreeDataProvider("labelTreeProvider", new LabelTreeProvider())
		);
	}

	onDidChangeTreeData?: vscode.Event<any> | undefined;

	getTreeItem(element: any): vscode.TreeItem | Thenable<vscode.TreeItem> {
		throw new Error("get Tree Item");
	}

	getChildren(element?: any): vscode.ProviderResult<any[]> {
		throw new Error("getChildren");
	}

	getParent?(element: any) {
		throw new Error("getParent");
	}

	resolveTreeItem?(item: vscode.TreeItem, element: any, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
		throw new Error("resolveTreeItem");
	}

}

class LabelTreeItem extends vscode.TreeItem {

}