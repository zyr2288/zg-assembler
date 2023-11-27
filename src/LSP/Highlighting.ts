import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

// enum HighlightType {	None, Label, Keyword, Macro, Defined, Variable, Number }

const VSCodeHighlight = ["label", "struct", "keyword", "function", "enumMember", "variable", "number"];

export class Highlighting {

	private static leagend: vscode.SemanticTokensLegend;

	static async Initialize(context: vscode.ExtensionContext) {
		Highlighting.leagend = new vscode.SemanticTokensLegend(VSCodeHighlight);
		context.subscriptions.push(
			vscode.languages.registerDocumentRangeSemanticTokensProvider(
				LSPUtils.assembler.config.FileExtension,
				{ provideDocumentRangeSemanticTokens: Highlighting.HighlightingDocument },
				Highlighting.leagend
			)
		);
	}

	private static async HighlightingDocument(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken) {
		const tokenBuilder = new vscode.SemanticTokensBuilder(Highlighting.leagend);
		await LSPUtils.WaitingCompileFinished();
		let highlightingTokens = LSPUtils.assembler.languageHelper.highlightingProvider.HighlightDocument(document.uri.fsPath);
		for (let i = 0; i < highlightingTokens.length; ++i) {
			const token = highlightingTokens[i];
			tokenBuilder.push(token.line, token.start, token.length, token.type);
		}

		return tokenBuilder.build();
	}


}