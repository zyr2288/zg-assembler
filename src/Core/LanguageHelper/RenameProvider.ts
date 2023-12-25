import { Compiler } from "../Base/Compiler";
import { ExpressionPart, PriorityType } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { ILabel, LabelScope, LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { EnumData, EnumDataTag } from "../Commands/EnumData";
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
		type: "None" as "None" | "Macro" | "Label" | "MacroLabel" | "DataGroup",
		macro: undefined as Macro | undefined,
		fileHash: 0
	};

	//#region 预备命名，获取重命名的范围
	/**
	 * 预备命名，获取重命名的范围
	 * @param filePath 文件路径
	 * @param lineNumber 行号，从0开始
	 * @param lineText 该行文本内容
	 * @param currect 当前光标位置
	 * @returns 文本起始位置和长度
	 */
	static PreRename(filePath: string, lineNumber: number, lineText: string, currect: number) {
		RenameProvider.ClearRename();

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		RenameProvider.SaveRename.fileHash = fileHash;
		const temp = HelperUtils.FindMatchToken(fileHash, lineNumber, lineText, currect);

		const result = { start: 0, length: 0 };
		switch (temp.matchType) {
			case "None":
			case "Include":
				return Localization.GetMessage("rename error");
			case "Label":
				if (LabelUtils.namelessLabelRegex.test(temp.matchToken!.text))
					return Localization.GetMessage("rename error");

				result.start = temp.matchToken!.start;
				result.length = temp.matchToken!.length;
				RenameProvider.SaveRename.token = temp.matchToken;
				RenameProvider.SaveRename.type = "Label";
				if (temp.macro) {
					const label = temp.macro.labels.get(RenameProvider.SaveRename.token!.text) ?? temp.macro.params.get(RenameProvider.SaveRename.token!.text);
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
		let match = !!(new RegExp(Platform.regexString, "ig").exec(newLabelStr));
		const allPart = newLabelStr.split(".");
		for (let i = 1; i < allPart.length; i++) {
			if (!allPart[i]) {
				match = true;
				break;
			}
		}

		if (match)
			return Localization.GetMessage("rename error");

		const labelIllegal = LabelUtils.CheckIllegal(newLabelStr, RenameProvider.SaveRename.type !== "Macro");
		if (!labelIllegal)
			return Localization.GetMessage("rename error");

		const result = new Map<string, Token[]>();

		let tempMacro: Macro | undefined;
		let tempLabel: ILabel | undefined;
		if (RenameProvider.SaveRename.type === "Label" || RenameProvider.SaveRename.type === "MacroLabel") {
			tempLabel = LabelUtils.FindLabel(RenameProvider.SaveRename.token, RenameProvider.SaveRename.macro);
		}

		const SaveLineToken = (lines: ICommonLine[], tokens: Token[]) => {
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const rangeType = HelperUtils.GetRange(line.orgText.fileHash, line.orgText.line);
				tempMacro = rangeType?.type === "Macro" ? Compiler.enviroment.allMacro.get(rangeType.key) : undefined;
				switch (RenameProvider.SaveRename.type) {
					case "Macro":
						switch (line.type) {
							case LineType.Macro:
								const macroLine = line as MacroLine;
								if (macroLine.macro.name.text === RenameProvider.SaveRename.token?.text)
									tokens.push(macroLine.macroToken);

								break;
						}
						break;
					case "Label":
					case "MacroLabel":
						switch (line.type) {
							case LineType.Instruction:
							case LineType.Macro:
							case LineType.Variable:
								const insLine = line as InstructionLine | MacroLine | VariableLine;
								tokens.push(...RenameProvider.RenameMatchLabel(insLine.expParts, tempLabel!.labelType, tempMacro));
								break;
							case LineType.Command:
								const comLine = line as CommandLine;
								switch (comLine.command.text) {
									case ".ENUM":
										const enumLines = (comLine.tag as EnumDataTag).lines;
										for (let i = 0; i < enumLines.length; i++) {
											const line = enumLines[i];
											tokens.push(...RenameProvider.RenameMatchLabel([line.exps], tempLabel!.labelType, tempMacro));
										}
										break;
									default:
										tokens.push(...RenameProvider.RenameMatchLabel(comLine.expParts, tempLabel!.labelType, tempMacro));
										break;
								}
								break;
						}
						break;
					case "DataGroup":
						break;
				}
			}
		}

		// 原始位置重命名
		switch (RenameProvider.SaveRename.type) {
			case "Label":
				const label = LabelUtils.FindLabel(RenameProvider.SaveRename.token, RenameProvider.SaveRename.macro);
				if (label) {
					const fileName = Compiler.enviroment.GetFile(label.token.fileHash);
					const tokens = result.get(fileName) ?? [];
					tokens.push(label.token);
					result.set(fileName, tokens);
				}
				break;
			case "MacroLabel":
				const macroLabel = LabelUtils.FindLabel(RenameProvider.SaveRename.token, RenameProvider.SaveRename.macro);
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

	/***** private *****/

	private static RenameMatchLabel(exps: ExpressionPart[][], labelType: LabelType, macro?: Macro) {
		const result: Token[] = [];
		if (!exps)
			return result;

		const labelToken = RenameProvider.SaveRename.token!;
		const fileHash = RenameProvider.SaveRename.fileHash;
		for (let i = 0; i < exps.length; i++) {
			for (let j = 0; j < exps[i].length; j++) {
				const exp = exps[i][j];
				if (exp.type !== PriorityType.Level_1_Label || exp.token.text !== labelToken.text)
					continue;

				if (exp.token.text.startsWith(".") && exp.token.fileHash === fileHash ||
					!exp.token.text.startsWith(".")) {
					const label = LabelUtils.FindLabel(exp.token, macro);
					if (label && label.labelType === labelType) {
						result.push(exp.token);
						continue;
					}
				}

				const tempLabel = LabelUtils.FindLabel(exp.token);
				if (!tempLabel || tempLabel.labelType !== LabelType.DataGroup)
					continue;

				const parts = exp.token.Split(/\:/g, { count: 2 });

				const dataGroup = Compiler.enviroment.allDataGroup.get(parts[0].text)!;

				if (!dataGroup)
					continue;

				if (RenameProvider.GetScopeAndHash(RenameProvider.SaveRename.token!.text) === LabelScope.Local &&
					RenameProvider.SaveRename.token?.fileHash !== dataGroup.label.token.fileHash)
					continue;


				if (RenameProvider.SaveRename.token!.text === parts[0].text) {
					result.push(parts[0]);
					continue;
				}

				if (RenameProvider.SaveRename.token!.text === parts[1].text) {
					result.push(parts[1]);
					continue;
				}
			}

		}
		return result;
	}

	private static GetScopeAndHash(text: string) {
		return text.startsWith(".") ? LabelScope.Local : LabelScope.Global;
	}

	private static ClearRename() {
		RenameProvider.SaveRename.fileHash = 0;
		RenameProvider.SaveRename.type = "None";
		RenameProvider.SaveRename.token = undefined;
		RenameProvider.SaveRename.macro = undefined;
	}
}