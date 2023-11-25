import { Assembler } from "../Assembler";
import { ExpressionPart, PriorityType } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";

export class RenameProvider {
	static RenameLabel(oldToken: Token, newToken: Token, option: DecodeOption) {
		if (RenameProvider.TokenCanRename(oldToken, newToken))
			return [];

		let oldLabel = LabelUtils.FindLabel(oldToken, option.macro);
		let newLabel = LabelUtils.FindLabel(newToken, option.macro);
		if (!oldLabel || newLabel)
			return [];

		let result = new Map<number, Token[]>();
		for (let i = 0; i < option.allLines.length; i++) {
			const line = option.GetLine(i);
			const fileHash = line.orgText.fileHash;
			const tokens = result.get(fileHash) ?? [];
			switch (line.type) {
				case LineType.Instruction:
					const insLine = line as InstructionLine;
					tokens.push(...RenameProvider.GetReplaceToken(oldToken, insLine.exprParts));
					break;
			}
			result.set(fileHash, tokens);
		}
		return result;
	}

	private static GetReplaceToken(searchToken: Token, expParts: ExpressionPart[][]) {
		let result: Token[] = [];
		for (let i = 0; i < expParts.length; i++) {
			for (let j = 0; j < expParts[i].length; j++) {
				const exp = expParts[i][j];
				if (exp.type !== PriorityType.Level_1_Label)
					continue;

				if (searchToken.text !== exp.token.text)
					continue;

				result.push(exp.token);
			}
		}
		return result;
	}

	private static TokenCanRename(oldToken: Token, newToken: Token) {
		return LabelUtils.namelessLabelRegex.test(oldToken.text) || LabelUtils.namelessLabelRegex.test(newToken.text);
	}
}