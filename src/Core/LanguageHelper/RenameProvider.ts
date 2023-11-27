import { Compiler } from "../Base/Compiler";
import { ExpressionPart, PriorityType } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { Platform } from "../Platform/Platform";
import { HelperUtils } from "./HelperUtils";

enum RenameType {
	Label, Macro, MacroParams, MacroLabel
}

/**重命名 */
export class RenameProvider {

	/**
	 * 预备命名，获取重命名的范围
	 * @param lineText 一行文本
	 * @param currect 当前光标位置
	 * @returns 文本起始位置和长度
	 */
	static PreRename(lineText: string, currect: number) {
		const tempResult = HelperUtils.GetWord(lineText, currect);
		return { start: tempResult.start, length: tempResult.leftText.length + tempResult.rightText.length };
	}

	/**
	 * 重命名标签
	 * @param lineText 行文本
	 * @param currect 当前光标位置
	 * @param line 行号
	 * @param filePath 文件路径
	 * @returns 文件ID与Token[]，空为命名错误
	 */
	static RenameLabel(lineText: string, currect: number, line: number, filePath: string, newLabelStr: string) {
		const tempResult = HelperUtils.GetWord(lineText, currect);
		const fileHash = FileUtils.GetFilePathHashcode(filePath);

		const match = new RegExp(Platform.regexString).exec(newLabelStr);
		if (match)
			return Localization.GetMessage("rename error");

		const oldToken = Token.CreateToken(fileHash, line, tempResult.start, tempResult.leftText + tempResult.rightText);
		const newToken = Token.CreateToken(fileHash, line, tempResult.start, newLabelStr);

		if (RenameProvider.TokenCanRename(oldToken, newToken))
			return [];

		const rangeType = HelperUtils.GetRange(fileHash, line);
		let macro = undefined;
		if (rangeType?.type === "Macro") {
			macro = Compiler.enviroment.allMacro.get(rangeType.key);
		}

		let result = new Map<number, Token[]>();

		const oldLabel = LabelUtils.FindLabel(oldToken, macro);
		const newLabel = LabelUtils.FindLabel(newToken, macro);
		if (!oldLabel || newLabel)
			return result;

		const allLines = Compiler.enviroment.allBaseLines;

		// for (let i = 0; i < option.allLines.length; i++) {
		// 	const line = option.GetLine(i);
		// 	const fileHash = line.orgText.fileHash;
		// 	const tokens = result.get(fileHash) ?? [];
		// 	switch (line.type) {
		// 		case LineType.Instruction:
		// 			const insLine = line as InstructionLine;
		// 			tokens.push(...RenameProvider.GetReplaceToken(oldToken, insLine.exprParts));
		// 			break;
		// 	}
		// 	result.set(fileHash, tokens);
		// }
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