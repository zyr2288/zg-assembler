import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

export class ReferencesProvider {
	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.languages.registerReferenceProvider(LSPUtils.assembler.config.FileExtension, {
				provideReferences: ReferencesProvider.References
			})
		)
	}

	private static async References(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken) {
		await LSPUtils.WaitingCompileFinished();

		const locResult = LSPUtils.assembler.languageHelper.references.GetReferences(document.fileName, position.line, position.character);

		const locations: vscode.Location[] = [];

		for (const key of locResult.keys()) {
			const locs = locResult.get(key)!;
			for (let i = 0; i < locs.length; i++) {
				const loc = locs[i];
				const uri = vscode.Uri.file(key);
				const range = new vscode.Range(loc.line, loc.start, loc.line, loc.start + loc.length);
				locations.push(new vscode.Location(uri, range));
			}
		}

		return locations;
	}
}