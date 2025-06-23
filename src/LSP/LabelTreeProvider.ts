import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";
import { Definition } from "./Definition";

export class LabelTreeProvider implements vscode.TreeDataProvider<LabelTreeItem> {

	private static LabelTreeRefresh: () => void;

	private _onDidChangeTreeData: vscode.EventEmitter<LabelTreeItem | undefined | null | void> = new vscode.EventEmitter<LabelTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<LabelTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	static Initialize(context: vscode.ExtensionContext) {
		const labelTree = new LabelTreeProvider();
		context.subscriptions.push(
			vscode.window.registerTreeDataProvider("labelTreeProvider", labelTree)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand("zg-assembler.labelTreeRefresh", () => {
				LabelTreeProvider.LabelTreeRefresh();
			})
		);

		context.subscriptions.push(
			vscode.commands.registerCommand("zg-assembler.outputLabels-2", (item: LabelTreeItem) => LabelTreeProvider.ExportLabels(item, 2)),
			vscode.commands.registerCommand("zg-assembler.outputLabels-10", (item: LabelTreeItem) => LabelTreeProvider.ExportLabels(item, 10)),
			vscode.commands.registerCommand("zg-assembler.outputLabels-16", (item: LabelTreeItem) => LabelTreeProvider.ExportLabels(item, 16)),
		);

		// vscode.commands.executeCommand('setContext', 'zg-assembler.labelTreeProvider.visible', true);
	}

	/**导出所有标签 */
	static async ExportLabels(item: LabelTreeItem, radix: number) {
		let result: string[] = [], index = 0;
		switch (item.type) {
			case "global":
				result = LSPUtils.assembler.languageHelper.labelTree.OutputVariableInfo("", radix);
				break;
			case "file":
				result = LSPUtils.assembler.languageHelper.labelTree.OutputVariableInfo(item.path, radix);
				break;
		}
		result.sort((a, b) => a.localeCompare(b));
		await vscode.env.clipboard.writeText(result.join("\n"));
		const msg = LSPUtils.assembler.localization.GetMessage("finished");
		LSPUtils.StatueBarShowText(msg);
		return result;
	}

	getTreeItem(element: LabelTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: LabelTreeItem): vscode.ProviderResult<LabelTreeItem[]> {
		const result: LabelTreeItem[] = [];
		if (!element) {
			if (!LabelTreeProvider.LabelTreeRefresh) {
				LabelTreeProvider.LabelTreeRefresh = () => this._onDidChangeTreeData.fire();
			}

			// 添加全局的变量树
			const msg = LSPUtils.assembler.localization.GetMessage("Global labels");
			const global = new LabelTreeGlobalItem(msg);
			global.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
			global.contextValue = "zg-assembler.outputLabels";
			result.push(global);

			// 添加所有局部的变量树
			LSPUtils.assembler.compiler.enviroment.allLabel.local.forEach((labelMap, fileIndex, map1) => {
				let filePath = LSPUtils.assembler.compiler.enviroment.GetFilePath(fileIndex);
				if (!filePath)
					return;

				const localItem = new LabelTreeFileItem("");
				localItem.path = filePath;
				filePath = vscode.workspace.asRelativePath(filePath, true);
				filePath = filePath.substring(vscode.workspace.name!.length + 1);

				localItem.label = filePath;
				localItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				localItem.contextValue = "zg-assembler.outputLabels";
				result.push(localItem);
			});
			return result;
		}

		// 获取变量
		let items;
		switch (element.type) {
			case "global":
				items = LSPUtils.assembler.languageHelper.labelTree.GetVariableInfo("");
				break;
			case "file":
				items = LSPUtils.assembler.languageHelper.labelTree.GetVariableInfo(element.path);
				break;
		}
		if (items) {
			items.forEach((label) => {
				const filePath = LSPUtils.assembler.compiler.enviroment.GetFilePath(label.fileIndex);
				if (!filePath)
					return;

				const item = new LabelTreeLabelItem(label.name);
				item.line = label.line;
				item.filePath = filePath;
				item.start = label.start;
				item.length = label.length;
				item.description = label.description;
				result.push(item);
			});
			result.sort((a, b) => (a.label as string).localeCompare(b.label as string));
		}

		return result;
	}

	resolveTreeItem(item: vscode.TreeItem, element: LabelTreeItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
		switch (element.type) {
			case "label":
				Definition.GotoLocation(element.filePath, element.line, element.start, element.length);
				break;
		}
		token.isCancellationRequested = true;
		return;
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
	filePath = "";
	line = 0;
	start = 0;
	length = 0;
}