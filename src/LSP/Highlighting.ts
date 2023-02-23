import * as vscode from "vscode";
import { LSPUtils } from "./LSPUtils";

enum VSCodeHightlightType { "label", "struct", "keyword", "macro", "enumMember", "variable" }

// enum HighlightType {	None, Label, Keyword, Macro, Defined, Variable}

const VSCodeHighlight = ["label", "struct", "keyword", "macro", "enumMember", "variable"];

export class Highlighting {

	private static leagend: vscode.SemanticTokensLegend;

	static async Initialize() {

		Highlighting.leagend = new vscode.SemanticTokensLegend(VSCodeHighlight);

		vscode.languages.registerDocumentRangeSemanticTokensProvider(
			LSPUtils.assembler.config.FileExtension,
			{ provideDocumentRangeSemanticTokens: Highlighting.HightlightingDocument },
			Highlighting.leagend
		);
	}

	private static async HightlightingDocument(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken) {

		const tokenBuilder = new vscode.SemanticTokensBuilder(Highlighting.leagend);

		let highlightingTokens = await LSPUtils.assembler.languageHelper.highlightingProvider.HighlightDocument(document.uri.fsPath);
		for (let i = 0; i < highlightingTokens.length; ++i) {
			const token = highlightingTokens[i];
			tokenBuilder.push(token.line, token.start, token.length, token.type);
		}

		return tokenBuilder.build();
	}
}