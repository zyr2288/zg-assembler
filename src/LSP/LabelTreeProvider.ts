import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";
import { Definition } from "./Definition";
import { Localization } from "../Core/I18n/Localization";

export class LabelTreeProvider implements vscode.TreeDataProvider<any> {

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.commands.registerCommand("zg-assembler.labelTreeRefresh", () => {
				console.log("refresh");
			})
		);
		context.subscriptions.push(
			vscode.commands.registerCommand("zg-assembler.outputLabels-2", (item: LabelTreeItem) => LabelTreeProvider.ExportLabels(item, 2)),
			vscode.commands.registerCommand("zg-assembler.outputLabels-10", (item: LabelTreeItem) => LabelTreeProvider.ExportLabels(item, 10)),
			vscode.commands.registerCommand("zg-assembler.outputLabels-16", (item: LabelTreeItem) => LabelTreeProvider.ExportLabels(item, 16)),
		);

		context.subscriptions.push(
			vscode.window.registerTreeDataProvider("labelTreeProvider", new LabelTreeProvider())
		);
	}

	static async ExportLabels(item: LabelTreeItem, radix: number) {
		let result: string[] = [], index = 0;
		switch (item.type) {
			case "global":
				LSPUtils.assembler.compiler.enviroment.allLabel.global.forEach((label, name, map) => {
					result[index] = label.token.text;
					if (label.value !== undefined) {
						const value = LSPUtils.ConvertValue(label.value);
						switch (radix) {
							case 2:
								result[index] += " = @" + value.bin;
								break;
							case 10:
								result[index] += " = " + value.dec;
								break;
							case 16:
								result[index] += " = $" + value.hex;
								break;
						}
					}
					index++;
				});
				break;
		}
		result.sort((a, b) => a.localeCompare(b));
		await vscode.env.clipboard.writeText(result.join("\n"));
		return result;
	}

	getTreeItem(element: LabelTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: LabelTreeItem): vscode.ProviderResult<LabelTreeItem[]> {
		const result: LabelTreeItem[] = [];
		if (!element) {
			const msg = LSPUtils.assembler.localization.GetMessage("Global labels");
			const global = new LabelTreeGlobalItem(msg);
			global.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
			global.contextValue = "zg-assembler.outputLabels";
			result.push(global);

			LSPUtils.assembler.compiler.enviroment.allLabel.local.forEach((labelMap, fileIndex, map1) => {
				const filePath = LSPUtils.assembler.compiler.enviroment.GetFilePath(fileIndex);
				if (!filePath)
					return;

				const localItem = new LabelTreeFileItem(filePath);
				localItem.path = filePath;
				localItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				result.push(localItem);
			});
			return result;
		}

		switch (element.type) {
			case "global":
				LSPUtils.assembler.compiler.enviroment.allLabel.global.forEach((label, name, map) => {
					const item = new LabelTreeLabelItem(name);
					item.line = label.token.line;
					item.filePath = LSPUtils.assembler.compiler.enviroment.GetFilePath(label.fileIndex);
					item.start = label.token.start;
					item.length = label.token.length;
					item.description = label.comment;
					result.push(item);
				});
				result.sort((a, b) => (a.label as string).localeCompare(b.label as string));
				break;
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