import * as vscode from "vscode";
import { Assembler } from "../Core/Assembler";
import { HightlightType } from "../Core/Lines/CommonLine";
import { LSPUtils } from "./LSPUtils";


enum TokenType { None, Label, Variable, Defined, Macro, Keyword }
enum VSCodeHightlightType { function, keyword, enumMember, struct, variable, operator }

export class Hightlighting {

	private static leagend: vscode.SemanticTokensLegend;

	static async Initialize() {
		let temp: string[] = [];
		for (let key in VSCodeHightlightType)
			temp.push(key);

		temp.splice(0, temp.length / 2);
		Hightlighting.leagend = new vscode.SemanticTokensLegend(temp);

		vscode.languages.registerDocumentRangeSemanticTokensProvider(
			LSPUtils.assembler.config.FileExtension,
			{ provideDocumentRangeSemanticTokens: Hightlighting.HightlightingDocument },
			Hightlighting.leagend
		);
	}


	private static HightlightingDocument(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken) {
		const tokenBuilder = new vscode.SemanticTokensBuilder(Hightlighting.leagend);

		let lines = LSPUtils.assembler.GetUpdateLines(document.uri.fsPath);

		for (let i = 0; i < lines.length; ++i) {
			const line = lines[i];
			const highlightingTokens = line.GetTokens?.();
			if (highlightingTokens) {
				for (let j = 0; j < highlightingTokens.length; ++j) {
					const token = highlightingTokens[j];
					switch (token.type) {
						case HightlightType.Label:
							tokenBuilder.push(token.token.line, token.token.start, token.token.text.length, VSCodeHightlightType.struct);
							break;
						case HightlightType.Defined:
							tokenBuilder.push(token.token.line, token.token.start, token.token.text.length, VSCodeHightlightType.enumMember);
							break;
						case HightlightType.Macro:
							tokenBuilder.push(token.token.line, token.token.start, token.token.text.length, VSCodeHightlightType.function);
							break;
						case HightlightType.Keyword:
							tokenBuilder.push(token.token.line, token.token.start, token.token.text.length, VSCodeHightlightType.keyword);
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