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
import { VariableLine } from "../Lines/VariableLine";
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

	//#region 预备命名，获取重命名的范围
	/**
	 * 预备命名，获取重命名的范围
	 * @param lineText 一行文本
	 * @param currect 当前光标位置
	 * @returns 文本起始位置和长度
	 */
	static PreRename(filePath: string, lineNumber: number, currect: number) {
		RenameProvider.ClearRename();

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const temp = HelperUtils.FindMatchToken(fileHash, lineNumber, currect);

		const result = { start: 0, length: 0 };
		switch (temp.matchType) {
			case "None":
			case "Include":
				return Localization.GetMessage("rename error");
			case "Label":
				result.start = temp.matchToken!.start;
				result.length = temp.matchToken!.length;
				RenameProvider.SaveRename.token = temp.matchToken;
				RenameProvider.SaveRename.type = "Label";
				RenameProvider.SaveRename.labelHash = temp.tag as number;
				if (temp.macro) {
					const label = temp.macro.labels.get(RenameProvider.SaveRename.labelHash) ?? temp.macro.params.get(RenameProvider.SaveRename.labelHash);
					if (label) {
						RenameProvider.SaveRename.macro = temp.macro;
						RenameProvider.SaveRename.type = "MacroLabel";
					}
				}
				break;
			case "Macro":
				result.start = temp.matchToken!.start;
				result.length = temp.matchToken!.length;
				RenameProvider.SaveRename.token = temp.matchToken;
				RenameProvider.SaveRename.type = "Macro";
				break;
			case "DataGroup":
				return Localization.GetMessage("rename error");

		}

		return result;
	}
	//#endregion 预备命名，获取重命名的范围

	//#region 重命名标签
	/**
	 * 重命名标签
	 * @param newLabelStr 新名字
	 * @returns 文件ID与Token[]，空为命名错误
	 */
	static RenameLabel(newLabelStr: string) {
		if (RenameProvider.SaveRename.type === "None")
			return Localization.GetMessage("rename error");

		// 检查新名称是否合法
		const match = new RegExp(Platform.regexString, "ig").exec(newLabelStr);
		const labelIllegal = LabelUtils.CheckIllegal(newLabelStr, RenameProvider.SaveRename.type !== "Macro");
		if (match || !labelIllegal)
			return Localization.GetMessage("rename error");

		const result = new Map<string, Token[]>();

		const SaveLineToken = (lines: ICommonLine[], tokens: Token[]) => {
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				switch (RenameProvider.SaveRename.type) {
					case "Macro":
						switch (line.type) {
							case LineType.Macro:
								const macroLine = line as MacroLine;
								tokens.push(macroLine.macroToken);
								break;
						}
						break;
					case "Label":
					case "MacroLabel":
						switch (line.type) {
							case LineType.Instruction:
							case LineType.Command:
							case LineType.Macro:
							case LineType.Variable:
								const insLine = line as InstructionLine | CommandLine | MacroLine | VariableLine;
								tokens.push(...RenameProvider.RenameMatchToken(insLine.expParts));
								break;
						}
						break;
				}
			}
		}

		// 原始位置重命名
		switch (RenameProvider.SaveRename.type) {
			case "Label":
				const label = LabelUtils.FindLabelWithHash(RenameProvider.SaveRename.labelHash, RenameProvider.SaveRename.macro);
				if (label) {
					const fileName = Compiler.enviroment.GetFile(label.token.fileHash);
					const tokens = result.get(fileName) ?? [];
					tokens.push(label.token);
					result.set(fileName, tokens);
				}
				break;
			case "MacroLabel":
				const macroLabel = LabelUtils.FindLabelWithHash(RenameProvider.SaveRename.labelHash, RenameProvider.SaveRename.macro);
				if (macroLabel) {
					const fileName = Compiler.enviroment.GetFile(macroLabel.token.fileHash);
					const tokens = result.get(fileName) ?? [];
					tokens.push(macroLabel.token);
					SaveLineToken(RenameProvider.SaveRename.macro!.lines, tokens);
					result.set(fileName, tokens);
					return result;
				}
				break;
			case "Macro":
				const macro = Compiler.enviroment.allMacro.get(RenameProvider.SaveRename.token!.text);
				if (macro) {
					const fileName = Compiler.enviroment.GetFile(macro.name.fileHash);
					const tokens = result.get(fileName) ?? [];
					tokens.push(macro.name);
					result.set(fileName, tokens);
				}
				break;
		}

		// 所有引用重命名
		const allLineKeys = Compiler.enviroment.allBaseLines.keys();
		for (const key of allLineKeys) {
			const lines = Compiler.enviroment.allBaseLines.get(key)!;
			const fileName = Compiler.enviroment.GetFile(key);
			const tokens = result.get(fileName) ?? [];
			SaveLineToken(lines, tokens);
			result.set(fileName, tokens);
		}
		return result;
	}
	//#endregion 重命名标签

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