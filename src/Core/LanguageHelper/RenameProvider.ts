import { Compiler } from "../Base/Compiler";
import { ExpressionPart, PriorityType } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { ILabel, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Macro } from "../Commands/Macro";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { ICommonLine, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { OnlyLabelLine } from "../Lines/OnlyLabelLine";
import { Platform } from "../Platform/Platform";
import { HelperUtils } from "./HelperUtils";

enum RenameType {
	None, Label, Macro, MacroParams, MacroLabel
}

/**重命名 */
export class RenameProvider {

	private static SaveRename = {
		token: undefined as Token | undefined,
		type: "None" as "None" | "Macro" | "Label" | "MacroLabel",
		labelHash: undefined as number | undefined,
		macro: undefined as Macro | undefined
	};

	/**
	 * 预备命名，获取重命名的范围
	 * @param lineText 一行文本
	 * @param currect 当前光标位置
	 * @returns 文本起始位置和长度
	 */
	static PreRename(filePath: string, lineNumber: number, lineText: string, currect: number) {
		RenameProvider.ClearRename();

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const temp = HelperUtils.FindMatchLine(fileHash, lineNumber);
		if (!temp.matchLine) {
			return Localization.GetMessage("rename error");
		}

		let token: Token | undefined;
		switch (temp.matchLine.type) {
			case LineType.Command:
				const commandLine = temp.matchLine as CommandLine;
				switch (commandLine.command.text) {
					case ".DEF":
					case ".DBG": case ".DWG": case ".DLG":
						RenameProvider.SaveRename.type = "Label";
						RenameProvider.SaveRename.labelHash = commandLine.labelHash;
						token = commandLine.labelToken!;
						break;
					case ".MACRO":
						RenameProvider.SaveRename.type = "Macro";
						RenameProvider.SaveRename.macro = temp.macro;
						token = temp.macro!.name;
						break;
				}
				break;
			case LineType.Macro:
				const macroLine = temp.matchLine as MacroLine;
				RenameProvider.SaveRename.type = "Macro";
				RenameProvider.SaveRename.macro = macroLine.macro;
				token = macroLine.macroToken;
				break;
			case LineType.OnlyLabel:
				const onlyLabelLine = temp.matchLine as any as OnlyLabelLine;
				RenameProvider.SaveRename.type = "Label";
				RenameProvider.SaveRename.labelHash = onlyLabelLine.labelHash;
				token = onlyLabelLine.labelToken!;
				break;
		}

		if (token && token.start <= currect && token.start + token.length >= currect) {
			RenameProvider.SaveRename.token = token;
			return { start: token.start, length: token.length };
		}

		RenameProvider.FindExpPart(lineNumber, currect, temp.matchLine.expParts, temp.macro);
		if (RenameProvider.SaveRename.type !== "None") {
			token = RenameProvider.SaveRename.token!;
			return { start: token.start, length: token.length };
		}

		RenameProvider.ClearRename();
		return Localization.GetMessage("rename error");
	}

	//#region 重命名标签
	/**
	 * 重命名标签
	 * @param lineText 行文本
	 * @param currect 当前光标位置
	 * @param line 行号
	 * @param filePath 文件路径
	 * @returns 文件ID与Token[]，空为命名错误
	 */
	static RenameLabel(newLabelStr: string) {
		if (RenameProvider.SaveRename.type === "None")
			return Localization.GetMessage("rename error");

		const newToken = RenameProvider.SaveRename.token!.Copy();
		newToken.text = newLabelStr;

		const match = new RegExp(Platform.regexString, "ig").exec(newLabelStr);
		const labelIllegal = LabelUtils.CheckIllegal(newToken, RenameProvider.SaveRename.type !== "Macro");
		if (match || !labelIllegal)
			return Localization.GetMessage("rename error");

		const result = new Map<string, Token[]>();


		let macroOrLabelOrgToken = { fileHash: undefined as number | undefined, token: {} as Token };
		switch (RenameProvider.SaveRename.type) {
			case "Label":
				const label = LabelUtils.FindLabelWithHash(RenameProvider.SaveRename.labelHash, RenameProvider.SaveRename.macro);
				if (label) {
					macroOrLabelOrgToken.fileHash = label.token.fileHash;
					macroOrLabelOrgToken.token = label.token;
				}
				break;
			case "Macro":
				const macro = Compiler.enviroment.allMacro.get(RenameProvider.SaveRename.token!.text);
				if (macro) {
					macroOrLabelOrgToken.fileHash = macro.name.fileHash;
					macroOrLabelOrgToken.token = macro.name;
				}
				break;
		}

		if (macroOrLabelOrgToken.fileHash !== undefined) {
			const fileName = Compiler.enviroment.GetFile(macroOrLabelOrgToken.fileHash);
			const tokens = result.get(fileName) ?? [];
			tokens.push(macroOrLabelOrgToken.token);
			result.set(fileName, tokens);
		}


		const allLineKeys = Compiler.enviroment.allBaseLines.keys();
		for (const key of allLineKeys) {
			const lines = Compiler.enviroment.allBaseLines.get(key)!;
			const fileName = Compiler.enviroment.GetFile(key);
			const tokens = result.get(fileName) ?? [];
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				switch (RenameProvider.SaveRename.type) {
					case "Macro":
						switch(line.type) {
							case LineType.Macro:
								const macroLine = line as MacroLine;
								tokens.push(macroLine.macroToken);
								break;
						}
						break;
					case "Label":
						switch (line.type) {
							case LineType.Instruction:
							case LineType.Command:
							case LineType.Macro:
								const insLine = line as InstructionLine | CommandLine | MacroLine;
								tokens.push(...RenameProvider.RenameMatchToken(insLine.expParts));
								break;
						}
						break;
				}


			}
			result.set(fileName, tokens);
		}
		return result;

		// if (RenameProvider.TokenCanRename(oldToken, newToken))
		// 	return [];

		// const rangeType = HelperUtils.GetRange(fileHash, line);
		// let macro = undefined;
		// switch (rangeType?.type) {
		// 	case "Macro":
		// 		macro = Compiler.enviroment.allMacro.get(rangeType.key);
		// 		break;
		// }

		// /**Key是fileHash */
		// const result = new Map<number, Token[]>();

		// const oldLabel = LabelUtils.FindLabel(oldToken, macro);
		// const newLabel = LabelUtils.FindLabel(newToken, macro);
		// if (!oldLabel || newLabel)
		// 	return result;

		// const allLines = Compiler.enviroment.allBaseLines;

		// // for (let i = 0; i < option.allLines.length; i++) {
		// // 	const line = option.GetLine(i);
		// // 	const fileHash = line.orgText.fileHash;
		// // 	const tokens = result.get(fileHash) ?? [];
		// // 	switch (line.type) {
		// // 		case LineType.Instruction:
		// // 			const insLine = line as InstructionLine;
		// // 			tokens.push(...RenameProvider.GetReplaceToken(oldToken, insLine.exprParts));
		// // 			break;
		// // 	}
		// // 	result.set(fileHash, tokens);
		// // }
		// return result;
	}
	//#endregion 重命名标签

	/**
	 * 查找满足的表达式Token
	 * @param currect 当前光标行位置
	 * @param exps 所有表达式
	 * @param macro 自定义函数
	 * @returns 
	 */
	private static FindExpPart(line: number, currect: number, exps: ExpressionPart[][], macro?: Macro) {
		for (let i = 0; i < exps.length; i++) {
			for (let j = 0; j < exps[i].length; j++) {
				const part = exps[i][j];
				if (part.type !== PriorityType.Level_1_Label)
					continue;

				if (part.token.line !== line ||
					part.token.start > currect ||
					part.token.start + part.token.length < currect)
					continue;

				RenameProvider.SaveRename.type = "Label";
				RenameProvider.SaveRename.labelHash = part.value;
				RenameProvider.SaveRename.token = part.token;
				break;
			}
		}
	}

	/**
	 * 查找满足光标位置的Token
	 * @param currect 一行当前光标位置
	 * @param tokens 所有要查找的Token
	 * @returns 
	 */
	private static FindToken(currect: number, tokens: Token[]) {
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token.start > currect || token.start + token.length < currect)
				continue;

			return token;
		}
	}

	private static RenameMatchToken(exps: ExpressionPart[][]) {
		const result: Token[] = [];
		if (!exps)
			return result;

		for (let i = 0; i < exps.length; i++) {
			for (let j = 0; j < exps[i].length; j++) {
				const exp = exps[i][j];
				if (exp.type !== PriorityType.Level_1_Label)
					continue;

				if (exp.value === RenameProvider.SaveRename.labelHash)
					result.push(exp.token);
			}

		}
		return result;
	}

	private static ClearRename() {
		RenameProvider.SaveRename.type = "None";
		RenameProvider.SaveRename.labelHash = undefined;
		RenameProvider.SaveRename.macro = undefined;
	}
}