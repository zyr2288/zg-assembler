import * as vscode from "vscode";
import { HighlightToken, HighlightType } from "../Core/Lines/CommonLine";
import { LSPUtils } from "./LSPUtils";

enum VSCodeHightlightType { function, keyword, enumMember, struct, variable, operator }

export class Highlighting {

	private static leagend: vscode.SemanticTokensLegend;

	static async Initialize() {
		let temp: string[] = [];
		for (let key in VSCodeHightlightType)
			temp.push(key);

		temp.splice(0, temp.length / 2);
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
		let saveToken: HighlightToken;

		let lines = LSPUtils.assembler.GetUpdateLines(document.uri.fsPath);

		const PushToken = (type: VSCodeHightlightType) => {
			tokenBuilder.push(saveToken.token.line, saveToken.token.start, saveToken.token.text.length, type);
		}

		for (let i = 0; i < lines.length; ++i) {
			const line = lines[i];
			const highlightingTokens = line.GetTokens?.();
			if (highlightingTokens) {
				for (let j = 0; j < highlightingTokens.length; ++j) {
					saveToken = highlightingTokens[j];
					switch (saveToken.type) {
						case HighlightType.Label:
							PushToken(VSCodeHightlightType.struct);
							break;
						case HighlightType.Defined:
							PushToken(VSCodeHightlightType.enumMember);
							break;
						case HighlightType.Macro:
							PushToken(VSCodeHightlightType.function);
							break;
						case HighlightType.Keyword:
							PushToken(VSCodeHightlightType.keyword);
							break;
					}
				}
			}

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