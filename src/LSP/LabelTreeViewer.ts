import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

type Item = string;

export const TreeViewName = "zg-assembly-treeView";

export class LabelTreeViewer {

	private static treeView: vscode.TreeView<Item>;

	/**初始化 */
	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.commands.registerTextEditorCommand(
				LSPUtils.assembler.config.ExtensionCommandNames.ShowLabelTree,
				LabelTreeViewer.UpdateTree
			)
		);

		LabelTreeViewer.treeView = vscode.window.createTreeView<Item>(TreeViewName, {
			treeDataProvider: {
				getTreeItem: LabelTreeViewer.GetItem,
				getChildren: LabelTreeViewer.GetChildren
			}
		})
	}

	private static UpdateTree() {
		console.log("haaha");
	}

	private static GetItem(t: Item) {
		var item = new vscode.TreeItem("haha");
		return item;
	}

	private static GetChildren(t: Item) {
		return [];
	}

}