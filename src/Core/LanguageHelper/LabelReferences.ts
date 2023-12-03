import { Compiler } from "../Base/Compiler";
import { ExpressionPart, PriorityType } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { Token } from "../Base/Token";
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
	static GetReferences(filePath: string, lineNumber: number, currect: number) {

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const temp = HelperUtils.FindMatchToken(fileHash, lineNumber, currect);

		const result = new Map<string, ReferencesToken[]>();

		const GetLineToken = (fileHash: number, lines: ICommonLine[]) => {
			const fileName = Compiler.enviroment.GetFile(fileHash);
			const res = result.get(fileName) ?? [];
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				switch (temp.matchType) {
					case "Macro":
						if (line.type === LineType.Macro) {
							const macroLine = line as MacroLine;
							LabelReferences.AddResultTokens(res, macroLine.macroToken);
							break;
						}
						break;
					case "Label":
						const labelHash = temp.tag as number;
						switch (line.type) {
							case LineType.Instruction:
							case LineType.Command:
							case LineType.Macro:
							case LineType.Variable:
								const insLine = line as InstructionLine | CommandLine | MacroLine | VariableLine;
								const tokens = LabelReferences.GetExpressionPartTokens(labelHash, insLine.expParts);
								LabelReferences.AddResultTokens(res, ...tokens);
								break;
							case LineType.OnlyLabel:
								const onlyLabelLine = line as OnlyLabelLine;
								if (labelHash === onlyLabelLine.label.hash)
									LabelReferences.AddResultTokens(res, onlyLabelLine.label.token);
								break;
						}
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

	private static GetExpressionPartTokens(hash: number, expParts: ExpressionPart[][]) {
		const tokens: Token[] = [];
		for (let i = 0; i < expParts.length; i++) {
			for (let j = 0; j < expParts[i].length; j++) {
				const part = expParts[i][j];
				if (part.type !== PriorityType.Level_1_Label)
					continue;

				if (part.value === hash)
					tokens.push(part.token);
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