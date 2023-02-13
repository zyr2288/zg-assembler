import { Assembler } from "../Core/Assembler";
import * as vscode from "vscode";

enum TokenType { None, Label, Variable, Defined, Macro, Keyword }

export class Hightlighting {

	private readonly assembler;
	private leagend!: vscode.SemanticTokensLegend;

	constructor(assembler: Assembler) {
		this.assembler = assembler;
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