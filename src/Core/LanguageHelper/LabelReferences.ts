import { Compiler } from "../Base/Compiler";
import { ExpressionPart, PriorityType } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { ILabel, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Macro } from "../Commands/Macro";
import { CommandLine } from "../Lines/CommandLine";
import { ICommonLine, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { OnlyLabelLine } from "../Lines/OnlyLabelLine";
import { VariableLine } from "../Lines/VariableLine";
import { HelperUtils } from "./HelperUtils";

interface ReferencesToken {
	line: number;
	start: number;
	length: number;
}

/**标签引用 */
export class LabelReferences {

	/**获取引用 */
	static GetReferences(filePath: string, lineNumber: number, lineText: string, currect: number) {

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const temp = HelperUtils.FindMatchToken(fileHash, lineNumber, lineText, currect);

		const result = new Map<string, ReferencesToken[]>();

		const GetLineToken = (fileHash: number, lines: ICommonLine[]) => {
			const fileName = Compiler.enviroment.GetFile(fileHash);
			const res = result.get(fileName) ?? [];

			let tempLabel: ILabel | undefined;
			switch (temp.matchType) {
				case "Label":
					tempLabel = LabelUtils.FindLabel(temp.matchToken, temp.macro);
					break;
			}

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				switch (temp.matchType) {
					case "Macro":
						if (line.type === LineType.Macro) {
							const macroLine = line as MacroLine;
							if (macroLine.macro.name.text === temp.matchToken!.text)
								LabelReferences.AddResultTokens(res, macroLine.macroToken);

							break;
						}
						break;
					case "Label":
						switch (line.type) {
							case LineType.Instruction:
							case LineType.Command:
							case LineType.Macro:
							case LineType.Variable:
								const insLine = line as InstructionLine | CommandLine | MacroLine | VariableLine;
								const tokens = LabelReferences.GetExpressionPartTokens(insLine.expParts, tempLabel, temp.macro);
								LabelReferences.AddResultTokens(res, ...tokens);
								break;
							case LineType.OnlyLabel:
								const onlyLabelLine = line as OnlyLabelLine;
								if (tempLabel === onlyLabelLine.saveLabel.label)
									LabelReferences.AddResultTokens(res, onlyLabelLine.saveLabel.label.token);

								break;
						}
						break;
					case "DataGroup":
						break;
				}
			}
			result.set(fileName, res);
		}

		// 所有引用
		const allLineKeys = Compiler.enviroment.allBaseLines.keys();
		for (const key of allLineKeys) {
			const lines = Compiler.enviroment.allBaseLines.get(key)!;
			GetLineToken(key, lines);
		}
		return result;
	}

	private static GetExpressionPartTokens(exps: ExpressionPart[][], label?: ILabel, macro?: Macro) {
		const tokens: Token[] = [];
		if (!label)
			return tokens;

		for (let i = 0; i < exps.length; i++) {
			for (let j = 0; j < exps[i].length; j++) {
				const exp = exps[i][j];
				if (exp.type !== PriorityType.Level_1_Label || exp.token.text !== label.token.text)
					continue;

				if (exp.token.text.startsWith(".") && exp.token.fileHash === label.token.fileHash ||
					!exp.token.text.startsWith(".")) {
					const label = LabelUtils.FindLabel(exp.token, macro);
					if (label) {
						tokens.push(exp.token);
						continue;
					}
				}

			}
		}

		return tokens;
	}

	private static AddResultTokens(result: ReferencesToken[], ...tokens: Token[]) {
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			result.push({ line: token.line, start: token.start, length: token.length });
		}
	}
}