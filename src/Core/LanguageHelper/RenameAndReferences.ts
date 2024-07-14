import { Expression, PriorityType } from "../Base/ExpressionUtils";
import { ILabelNormal, LabelUtils } from "../Base/Label";
import { Macro } from "../Base/Macro";
import { Token } from "../Base/Token";
import { DataCommandTag } from "../Command/DataCommand";
import { EnumTag } from "../Command/EnumCommand";
import { AddressTag } from "../Command/OrgAndBase";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { CommonLine } from "../Lines/CommonLine";
import { HelperUtils } from "./HelperUtils";

type MatchType = "none" | "macro" | "label" | "macroLabel" | "dataGroup";

export class RenameAndReferences {

	private static SaveRename = {
		token: undefined as Token | undefined,
		type: "none" as MatchType,
		macro: undefined as Macro | undefined,
		fileIndex: 0
	};

	/***** 重命名 *****/

	//#region 预备命名，获取重命名的范围
	/**
	 * 预备命名，获取重命名的范围
	 * @param filePath 文件路径
	 * @param lineNumber 行号，从0开始
	 * @param lineText 该行文本内容
	 * @param currect 当前光标位置
	 * @returns 文本起始位置和长度
	 */
	static PreRename(filePath: string, lineText: string, lineNumber: number, currect: number) {
		RenameAndReferences.ClearRename();

		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		RenameAndReferences.SaveRename.fileIndex = fileIndex;
		const temp = HelperUtils.FindMatchToken(fileIndex, lineText, lineNumber, currect);

		if (temp.type === "number")
			return Localization.GetMessage("rename error");

		if (temp.type === "none" && LabelUtils.CheckIllegal(lineText.trim(), true)) {
			temp.type = "label";
			temp.token = new Token(lineText, { line: lineNumber }).Trim();
			if (!RenameAndReferences.CheckLabelIllegal(temp.token.text, true))
				return Localization.GetMessage("rename error");
		}

		const result = { start: 0, length: 0 };
		switch (temp.type) {
			case "filePath":
				return Localization.GetMessage("rename error");
			case "label":
				if (!RenameAndReferences.CheckLabelIllegal(temp.token!.text, true))
					return Localization.GetMessage("rename error");

				result.start = temp.token!.start;
				result.length = temp.token!.length;
				RenameAndReferences.SaveRename.token = temp.token;
				RenameAndReferences.SaveRename.type = "label";
				// if (temp.macro) {
				// 	const label = temp.macro.labels.get(RenameProvider.SaveRename.token!.text) ?? temp.macro.params.get(RenameProvider.SaveRename.token!.text);
				// 	if (label) {
				// 		RenameProvider.SaveRename.macro = temp.macro;
				// 		RenameProvider.SaveRename.type = "MacroLabel";
				// 	}
				// }
				break;
			case "macro":
				result.start = temp.token!.start;
				result.length = temp.token!.length;
				RenameAndReferences.SaveRename.token = temp.token;
				RenameAndReferences.SaveRename.type = "macro";
				break;
			// case "DataGroup":
			// 	return Localization.GetMessage("rename error");
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
		if (RenameAndReferences.SaveRename.type === "none")
			return Localization.GetMessage("rename error");

		if (!RenameAndReferences.CheckLabelIllegal(newLabelStr, RenameAndReferences.SaveRename.type !== "macro"))
			return Localization.GetMessage("rename error");

		const result = new Map<string, Token[]>();

		let tempMacro: Macro | undefined;
		let tempLabel: ILabelNormal | undefined;
		if (RenameAndReferences.SaveRename.type === "label" || RenameAndReferences.SaveRename.type === "macroLabel") {
			tempLabel = LabelUtils.FindLabel(RenameAndReferences.SaveRename.token!, { macro: RenameAndReferences.SaveRename.macro }) as ILabelNormal | undefined;
		}

		// 原始位置重命名
		switch (RenameAndReferences.SaveRename.type) {
			case "label":
				const label = LabelUtils.FindLabel(RenameAndReferences.SaveRename.token!, { macro: RenameAndReferences.SaveRename.macro });
				if (label) {
					const fileName = Compiler.enviroment.GetFilePath(label.fileIndex);
					const tokens = result.get(fileName) ?? [];
					tokens.push(label.token);
					result.set(fileName, tokens);
				}
				break;
			case "macroLabel":
				const macroLabel = LabelUtils.FindLabel(RenameAndReferences.SaveRename.token!, { macro: RenameAndReferences.SaveRename.macro });
				if (macroLabel) {
					const fileName = Compiler.enviroment.GetFilePath(macroLabel.fileIndex);
					const tokens = result.get(fileName) ?? [];
					tokens.push(macroLabel.token);
					RenameAndReferences.SaveLineToken(
						RenameAndReferences.SaveRename.type,
						RenameAndReferences.SaveRename.token!.text,
						RenameAndReferences.SaveRename.macro!.lines,
						tokens
					);
					result.set(fileName, tokens);
					return result;
				}
				break;
			case "macro":
				const macro = Compiler.enviroment.allMacro.get(RenameAndReferences.SaveRename.token!.text);
				if (macro) {
					const fileName = Compiler.enviroment.GetFilePath(macro.fileIndex);
					const tokens = result.get(fileName) ?? [];
					tokens.push(macro.name);
					result.set(fileName, tokens);
				}
				break;
		}

		// 所有引用重命名
		const allLineKeys = Compiler.enviroment.allLine.keys();
		for (const key of allLineKeys) {
			const lines = Compiler.enviroment.allLine.get(key)!;
			const fileName = Compiler.enviroment.GetFilePath(key);
			const tokens = result.get(fileName) ?? [];
			RenameAndReferences.SaveLineToken(RenameAndReferences.SaveRename.type, RenameAndReferences.SaveRename.token!.text, lines, tokens);
			result.set(fileName, tokens);
		}
		return result;
	}
	//#endregion 重命名标签

	//#region 清除重命名参数
	private static ClearRename() {
		RenameAndReferences.SaveRename.fileIndex = -1;
		RenameAndReferences.SaveRename.type = "none";
		RenameAndReferences.SaveRename.token = undefined;
		RenameAndReferences.SaveRename.macro = undefined;
	}
	//#endregion 清除重命名参数

	//#region 检查标签是否合规
	/**
	 * 检查标签是否合规
	 * @param text 检查的文本
	 * @param allowDot 是否允许点
	 * @returns true为合规
	 */
	private static CheckLabelIllegal(text: string, allowDot: boolean) {

		// 是否合规
		if (!LabelUtils.CheckIllegal(text, allowDot))
			return false;

		// 所有小节是否为空
		const allPart = text.split(".");
		for (let i = 1; i < allPart.length; i++) {
			if (!allPart[i])
				return false;
		}

		return true;
	}
	//#endregion 检查标签是否合规

	/***** 查找引用和定义 *****/

	static GetReferences(filePath: string, lineText: string, lineNumber: number, currect: number) {
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		const temp = HelperUtils.FindMatchToken(fileIndex, lineText, lineNumber, currect);

		const result: Map<string, Token[]> = new Map();
		switch (temp.type) {
			case "number":
			case "comment":
			case "instruction":
			case "command":
			case "none":
			case "filePath":
				return result;
			case "label":
				break;
			case "macro":
				break;
		}

		// 所有引用重命名
		const allLineKeys = Compiler.enviroment.allLine.keys();
		for (const key of allLineKeys) {
			const lines = Compiler.enviroment.allLine.get(key)!;
			const fileName = Compiler.enviroment.GetFilePath(key);
			const tokens = result.get(fileName) ?? [];
			RenameAndReferences.SaveLineToken(RenameAndReferences.SaveRename.type, RenameAndReferences.SaveRename.token!.text, lines, tokens);
			result.set(fileName, tokens);
		}
		return result;

		return result;
	}

	/***** 其它 *****/

	//#region 查找所有匹配的词元
	/**
	 * 查找所有匹配的词元
	 * @param lines 要检查的所有行
	 * @param resultToken 要保存的结果Token
	 */
	private static SaveLineToken(matchType: MatchType, matchText: string, lines: CommonLine[], resultToken: Token[]) {
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line)
				continue;

			switch (line.key) {
				case "macro":
					if (matchType === "macro")
						resultToken.push(line.name);

					break;
				case "instruction":
					if (matchType === "label")
						RenameAndReferences.FindMatchInExpression(matchText, resultToken, ...line.expressions);

					break;
				case "variable":
					if (matchType === "label")
						RenameAndReferences.FindMatchInExpression(matchText, resultToken, line.expression);

					break;
				case "command":
					if (matchType === "label")
						RenameAndReferences.GetCommandExpression(line, resultToken);

					break;
			}
		}
	}
	//#endregion 查找所有匹配的词元

	//#region 获取命令表达式
	private static GetCommandExpression(line: CommandLine, resultToken: Token[]) {
		const com = line.command.text.toUpperCase();

		const matchText = RenameAndReferences.SaveRename.token!.text;

		let tag;
		switch (com) {
			case ".DB": case ".DW": case ".DL":
				tag = line.tag as DataCommandTag;
				RenameAndReferences.FindMatchInExpression(matchText, resultToken, ...tag);
				break;
			case ".ORG": case ".BASE":
				tag = line.tag as AddressTag;
				RenameAndReferences.FindMatchInExpression(matchText, resultToken, tag);
				break;
			case ".ENUM":
				tag = line.tag as EnumTag;
				if (tag.start.exp)
					RenameAndReferences.FindMatchInExpression(matchText, resultToken, tag.start.exp);

				for (let i = 0; i < tag.lines.length; i++) {
					const line = tag.lines[i];
					if (!line)
						continue;

					RenameAndReferences.FindMatchInExpression(matchText, resultToken, line.expression);
				}
				break;
		}
	}
	//#endregion 获取命令表达式

	//#region 重命名表达式
	/**
	 * 重命名表达式
	 * @param rename 原来的名称
	 * @param result 重命名结果Token集合
	 * @param expressions 所有表达式
	 */
	private static FindMatchInExpression(matchText: string, result: Token[], ...expressions: Expression[]) {
		for (let i = 0; i < expressions.length; i++) {
			for (let j = 0; j < expressions[i].parts.length; j++) {
				const part = expressions[i].parts[j];
				if (part.type !== PriorityType.Level_1_Label && part.token.text !== matchText)
					continue;

				result.push(part.token);
			}
		}
	}
	//#endregion 重命名表达式

}