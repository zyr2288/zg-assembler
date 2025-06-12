import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

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

	getTreeItem(element: LabelTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		switch (element.type) {
			case "global":
				const msg = LSPUtils.assembler.localization.GetMessage("Global labels");
				const global = new LabelTreeGlobalItem(msg);
				global.
				return global;
		}
		console.log(element);
		throw new Error("get Tree Item");
	}

	getChildren(element?: any): vscode.ProviderResult<LabelTreeItem[]> {
		if (!element) {
			const result: LabelTreeItem[] = [];
			const msg = LSPUtils.assembler.localization.GetMessage("Global labels");
			const global = new LabelTreeGlobalItem(msg);
			result.push(global);
			return result;
		}
		console.log(element);
		throw new Error("getChildren");
	}

	getParent?(element: any) {
		throw new Error("getParent");
	}

	resolveTreeItem?(item: vscode.TreeItem, element: any, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
		throw new Error("resolveTreeItem");
	}

}

type LabelTreeItem = LabelTreeGlobalItem | LabelTreeFileItem | LabelTreeLabelItem;

class LabelTreeGlobalItem extends vscode.TreeItem {
	type: "global" = "global";
}

class LabelTreeFileItem extends vscode.TreeItem {
	type: "file" = "file";
	path = "";
}

class LabelTreeLabelItem extends vscode.TreeItem {
	type: "label" = "label";
	name = "";
	line = 0;
}