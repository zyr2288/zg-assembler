import * as vscode from "vscode";
import { HighlightToken } from "../Core/Lines/CommonLine";
import { LSPUtils } from "./LSPUtils";

enum VSCodeHightlightType { "label", "struct", "keyword", "macro", "enumMember", "variable" }

// enum HighlightType {	None, Label, Keyword, Macro, Defined, Variable}

export class Highlighting {

	private static leagend: vscode.SemanticTokensLegend;

	static async Initialize() {
		let temp: string[] = ["label", "struct", "keyword", "macro", "enumMember", "variable"];

		Highlighting.leagend = new vscode.SemanticTokensLegend(temp);

		vscode.languages.registerDocumentRangeSemanticTokensProvider(
			LSPUtils.assembler.config.FileExtension,
			{ provideDocumentRangeSemanticTokens: Highlighting.HightlightingDocument },
			Highlighting.leagend
		);
	}

	private static async HightlightingDocument(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken) {

		await LSPUtils.WaitTextUpdate();

		const tokenBuilder = new vscode.SemanticTokensBuilder(Highlighting.leagend);

		let highlightingTokens = LSPUtils.assembler.languageHelper.highlightingProvider.HighlightDocument(document.uri.fsPath);
		for (let i = 0; i < highlightingTokens.length; ++i) {
			const token = highlightingTokens[i];
			tokenBuilder.push(token.line, token.start, token.length, token.type);
		}

		return tokenBuilder.build();
	}

	RegisterToken() {
		// vscode.languages.registerDocumentSemanticTokensProvider(this.assembler.config.FileExtension, {
		// 	provideDocumentSemanticTokens: async (document: vscode.TextDocument, token: vscode.CancellationToken) => {
		// 		const tokenBuilder = new vscode.SemanticTokensBuilder(this.leagend);
		// 		// await this.WaitTextUpdate();
		// 		try {
		// 			let allLines = this.assembler.baseHelper.GetUpdateLine(document.fileName);
		// 			for (let i = 0; i < allLines.length; i++) {
		// 				const line = allLines[i];
		// 				if (line.lineType == BaseLineType.Unknow)
		// 					continue;

		// 				let tokens = line.GetToken();
		// 				for (let j = 0; j < tokens.length; j++) {
		// 					const token = tokens[j];
		// 					switch (token.type) {
		// 						case TokenType.Keyword:
		// 							tokenBuilder.push(token.lineNumber, token.startColumn, token.text.length, HightlightType.keyword);
		// 							break;
		// 						case TokenType.Defined:
		// 							tokenBuilder.push(token.lineNumber, token.startColumn, token.text.length, HightlightType.enumMember);
		// 							break;
		// 						case TokenType.Label:
		// 							tokenBuilder.push(token.lineNumber, token.startColumn, token.text.length, HightlightType.struct);
		// 							break;
		// 						case TokenType.Macro:
		// 							tokenBuilder.push(token.lineNumber, token.startColumn, token.text.length, HightlightType.function);
		// 							break;
		// 					}
		// 				}
		// 			}
		// 		} catch (e) {
		// 			console.log(e);
		// 		}
		// 		return tokenBuilder.build();
		// 	}
		// }, this.leagend);
	}
}