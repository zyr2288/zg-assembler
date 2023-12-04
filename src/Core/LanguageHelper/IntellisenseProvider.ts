import { Compiler } from "../Base/Compiler";
import { Config } from "../Base/Config";
import { FileUtils } from "../Base/FileUtils";
import { ILabel, LabelScope, LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Commands } from "../Commands/Commands";
import { Macro } from "../Commands/Macro";
import { Localization } from "../I18n/Localization";
import { AsmCommon } from "../Platform/AsmCommon";
import { HelperUtils } from "./HelperUtils";

const ignoreWordStr = /;|(^|\s+)(\.HEX|\.DBG|\.DWG|\.MACRO)(\s+|$)/ig;

//#region 提示类型
enum CompletionType {
	Instruction, Command, Macro, Defined, Label, MacroLabel, Folder, File
}
//#endregion 提示类型

//#region 提示项
export class Completion {

	/**复制所有提示 */
	static CopyList(all: Completion[]) {
		const result: Completion[] = [];
		for (let i = 0; i < all.length; i++) {
			result.push(all[i]);
		}
		return result;
	}

	//#region 构造函数
	/**
	 * 构造函数
	 * @param option.showText 显示的文本
	 * @param option.insertText 插入的文本，默认与显示一致
	 * @param option.index 排序Index，默认0
	 * @param option.comment 注释
	 * @param option.type 提示类型，默认空
	 * @param option.command 附加数据
	 */
	constructor(option: {
		showText: string, insertText?: string,
		index?: number, comment?: string,
		type?: CompletionType, tag?: TriggerSuggestType
	}) {
		this.showText = option.showText;
		this.insertText = option.insertText ?? option.showText;
		this.index = option.index ?? 0;
		this.comment = option.comment;
		this.type = option.type;
		this.triggerType = option.tag;
	}
	//#endregion 构造函数

	/**显示的文本 */
	showText: string = "";
	/**插入的文本 */
	insertText: string = "";
	/**排序 */
	index: number = 0;
	/**注释 */
	comment?: string;
	/**提示类型 */
	type?: CompletionType;
	/**附加数据 */
	triggerType?: TriggerSuggestType;

	Copy() {
		let completion = Utils.DeepClone<Completion>(this);
		return completion;
	}
}
//#endregion 提示项

interface HighlightRange {
	type: "DataGroup" | "Macro";
	key: string;
	start: number;
	end: number;
}

const NotInMacroCommands = [".DBG", ".DWG", ".MACRO", ".DEF", ".INCLUDE", ".INCBIN", ".BASE", ".ORG"];

export enum CompletionRange { None, Base, Label, Macro, Path, AddressingMode }

enum TriggerSuggestType {
	None, AllAsm, AllFile
}

export interface TriggerSuggestTag {
	type: TriggerSuggestType;
	data: string;
}

/**智能提示类 */
export class IntellisenseProvider {

	/**编译器命令提示 */
	private static commandCompletions: Completion[] = [];

	/**在Macro里的命令提示 */
	private static commandNotInMacroCompletions: Completion[] = [];

	/**汇编指令提示类 */
	private static instructionCompletions: Completion[] = [];

	//#region 智能提示
	/**
	 * 智能提示
	 * @param document 文本
	 * @param option 
	 * @returns 
	 */
	static Intellisense(filePath: string, lineNumber: number, lineText: string, lineCurrect: number, trigger?: string): Completion[] {
		if (!Config.ProjectSetting.intellisense)
			return [];

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const line = Token.CreateToken(fileHash, lineNumber, 0, lineText);
		const prefix = line.Substring(0, lineCurrect);

		if (ignoreWordStr.test(prefix.text))
			return [];

		const rangeType = HelperUtils.GetRange(fileHash, lineNumber);
		let macro: Macro | undefined;
		switch (rangeType?.type) {
			case "DataGroup":
				if (trigger === " ")
					return [];

				const prefix = HelperUtils.GetWord(lineText, lineCurrect);
				return IntellisenseProvider.GetLabel(fileHash, prefix.leftText);
			case "Macro":
				macro = Compiler.enviroment.allMacro.get(rangeType.key);
				break;
		}

		const tempMatch = HelperUtils.BaseSplit(lineText);
		if (tempMatch.type === "None" || lineCurrect < tempMatch.start)
			return IntellisenseProvider.GetEmptyLineHelper({ fileHash, range: rangeType, trigger: trigger });

		const matchIndex = tempMatch.start + tempMatch.text.length + 1;
		switch (tempMatch.type) {
			case "Instruction":
				if (trigger === " " && lineCurrect === matchIndex) {
					return IntellisenseProvider.GetInstructionAddressingModes(tempMatch.text);
				} else if (trigger === ":" && lineCurrect > matchIndex) {
					const prefix = HelperUtils.GetWord(lineText, lineCurrect);
					return IntellisenseProvider.GetDataGroup(prefix.leftText);
				} else if (trigger !== " " && lineCurrect > matchIndex) {
					const restText = lineText.substring(matchIndex);
					const tempCurrect = lineCurrect - matchIndex - 1;
					const ignoreContent = AsmCommon.MatchLinePosition(tempMatch.text, restText, tempCurrect);
					if (ignoreContent)
						return [];

					const prefix = HelperUtils.GetWord(lineText, lineCurrect);
					return IntellisenseProvider.GetLabel(fileHash, prefix.leftText, macro);
				}
				break;
			case "Command":
			case "Variable":
			case "Macro":
				if (lineCurrect < matchIndex || trigger === " ") {
					return [];
				} else if (trigger === ":" && lineCurrect > matchIndex) {
					const prefix = HelperUtils.GetWord(lineText, lineCurrect);
					return IntellisenseProvider.GetDataGroup(prefix.leftText);
				}

				const prefix = HelperUtils.GetWord(lineText, lineCurrect);
				return IntellisenseProvider.GetLabel(fileHash, prefix.leftText, macro);
		}
		return [];
	}
	//#endregion 智能提示

	/***** Private *****/

	//#region 获取空行帮助
	/**
	 * 获取空行帮助
	 * @param trigger 触发字符串
	 */
	private static GetEmptyLineHelper(option: { fileHash: number, range?: HighlightRange, trigger?: string, macro?: Macro }): Completion[] {
		switch (option.trigger) {
			case " ":
			case ":":
				return [];
			case ".":
				switch (option.range?.type) {
					case "Macro":
						return IntellisenseProvider.commandNotInMacroCompletions;
					case "DataGroup":
						return IntellisenseProvider.GetLabel(option.fileHash, "");
					default:
						return IntellisenseProvider.commandCompletions;
				}
			default:
				if (option.range?.type === "DataGroup") {
					return IntellisenseProvider.GetLabel(option.fileHash, "");
				} else {
					const completions: Completion[] = [];
					completions.push(...IntellisenseProvider.instructionCompletions);
					Compiler.enviroment.allMacro.forEach((macro) => {
						let insertText: string | undefined;
						if (macro.paramHashIndex.length !== 0) {
							insertText = macro.name.text + " ";
							for (let i = 0; i < macro.paramHashIndex.length; i++)
								insertText += `[exp], `;

							insertText = insertText.substring(0, insertText.length - 2);
						}

						const com = new Completion({
							showText: macro.name.text,
							index: 0,
							type: CompletionType.Macro,
							insertText
						});

						completions.push(com);
					});
					return completions;
				}
		}

		return [];
	}
	//#endregion 获取空行帮助

	//#region 获取文件帮助
	/**获取文件帮助 */
	static async GetFileHelper(topRoot: string, path: string, fileFilter: TriggerSuggestType, excludeFile: string) {

		let completions: Completion[] = [];
		if (!FileUtils.ReadFile)
			return [];

		topRoot = FileUtils.ArrangePath(topRoot);
		path = FileUtils.ArrangePath(path);

		let folder = await FileUtils.GetPathFolder(path);

		let exFileName = await FileUtils.GetFileName(excludeFile);
		let sameFolder = (await FileUtils.GetPathFolder(excludeFile)) === folder;

		if (topRoot !== folder) {
			let com = new Completion({ showText: "..", insertText: "..", index: 0 });
			com.type = CompletionType.Folder;
			completions.push(com);
		}

		let files = await FileUtils.GetFolderFiles(folder);
		for (let i = 0; i < files.length; ++i) {
			if ((sameFolder && files[i].name === exFileName) ||
				(fileFilter === TriggerSuggestType.AllAsm && files[i].type === "file" && !files[i].name.endsWith(".asm")))
				continue;

			let com = new Completion({ showText: "" });
			switch (files[i].type) {

				case "folder":
					com.index = 1;
					com.type = CompletionType.Folder;
					break;

				case "file":
					com.index = 2;
					com.type = CompletionType.File;
					break;

			}
			com.showText = files[i].name;
			com.insertText = files[i].name;
			completions.push(com);
		}

		return completions;
	}
	//#endregion 获取文件帮助

	//#region 获取Label
	/**
	 * 获取Label
	 * @param fileHash 文件Hash
	 * @param prefix 前缀
	 * @param macro 自定义函数
	 * @returns 
	 */
	private static GetLabel(fileHash: number, prefix: string, macro?: Macro): Completion[] {
		let result: Completion[] = [];
		if (macro) {

			const GetCompletion = (value: ILabel) => {
				let com = new Completion({ showText: value.token.text });
				result.push(com);
			}

			macro.labels.forEach(GetCompletion);
			macro.params.forEach(GetCompletion);
		}

		let labelScope = prefix.startsWith(".") ? LabelScope.Local : LabelScope.Global;
		let index = prefix.lastIndexOf(".");

		if (index > 0) {
			prefix = prefix.substring(0, index);
		} else {
			prefix = "";
		}

		let labelHash = LabelUtils.GetLebalHash(prefix, fileHash, labelScope);
		let topLabel = Compiler.enviroment.labelTrees.get(labelHash);
		if (topLabel) {
			topLabel.child.forEach((labelHash) => {
				let label = Compiler.enviroment.allLabel.get(labelHash);
				if (!label)
					return [];

				let showText = label.token.text.substring(index + 1);
				let item = new Completion({ showText, comment: label.comment });
				switch (label.labelType) {
					case LabelType.Defined:
						item.type = CompletionType.Defined;
						break;
					case LabelType.Label:
						item.type = CompletionType.Label;
						break;
				}
				if (label.value) {
					let value = Utils.ConvertValue(label.value);
					let tempStr = `HEX: $${value.hex}\nDEC: ${value.dec}\nBIN: @${value.bin}`;
					if (item.comment)
						item.comment += "\n-----\n\n" + tempStr;
					else
						item.comment = "-----\n\n" + tempStr;
				}
				result.push(item);
			});
		}

		return result;
	}
	//#endregion 获取Label

	//#region 获取DataGroup
	/**
	 * 获取DataGroup
	 * @param prefix 数据组名称
	 * @returns 
	 */
	private static GetDataGroup(prefix: string): Completion[] {
		const result: Completion[] = [];
		const parts = prefix.split(/\s*:\s*/, 2);
		if (!parts[0])
			return result;

		let hash = Utils.GetHashcode(parts[0]);
		const datagroup = Compiler.enviroment.allDataGroup.get(hash);
		if (!datagroup)
			return result;

		if (!parts[1]) {
			datagroup.labelHashAndIndex.forEach((value) => {
				const values = value.values();
				for (const v of values) {
					const com = new Completion({ showText: v.text, insertText: v.text });
					result.push(com);
					break;
				}

			});
			return result;
		}


		hash = Utils.GetHashcode(parts[1]);
		const members = datagroup.labelHashAndIndex.get(hash);
		if (!members)
			return result;

		let index = 0;
		for (const key of members.keys()) {
			const com = new Completion({ showText: index.toString() });
			result.push(com);
			index++;
		}
		return result;
	}
	//#endregion 获取DataGroup

	/***** 更新基础帮助 *****/

	//#region 获取汇编指令地址模式
	/**获取汇编指令地址模式 */
	private static GetInstructionAddressingModes(instruction: string) {
		const modes = AsmCommon.allInstructions.get(instruction.toUpperCase());
		if (!modes)
			return [];

		const completions: Completion[] = [];
		for (let j = 0; j < modes.length; ++j) {
			const com = new Completion({ showText: "" });
			if (!modes[j].addressingMode) {
				com.showText = Localization.GetMessage("empty addressing mode");
				com.insertText = "\n";
				com.index = 0;
			} else {
				com.showText = modes[j].addressingMode!;
				com.insertText = modes[j].addressingMode!;
				com.index = 1;
			}
			completions.push(com);
		}
		return completions;
	}
	//#endregion 获取汇编指令地址模式

	//#region 更新所有汇编指令
	/**更新所有汇编指令 */
	static UpdateInstrucionCompletions() {
		IntellisenseProvider.instructionCompletions = [];
		for (let i = 0; i < AsmCommon.instructions.length; ++i) {
			const instruction = AsmCommon.instructions[i];
			const insType = AsmCommon.allInstructions.get(instruction)!;

			let insertText = instruction;
			if (insType.length === 1 && !insType[0].addressingMode) {
				insertText += "\n";
			}

			const completion = new Completion({ showText: instruction, index: 10, insertText, type: CompletionType.Instruction });
			IntellisenseProvider.instructionCompletions.push(completion);
		}
	}
	//#endregion 更新所有汇编指令

	//#region 更新所有编译器命令
	/**更新所有编译器命令 */
	static UpdateCommandCompletions() {
		Commands.allCommandNames.forEach(value => {
			let completion = new Completion({
				showText: value,
				insertText: value.substring(1),
				type: CompletionType.Command
			});

			switch (value) {
				case ".INCLUDE":
					completion.insertText = completion.insertText + " \"[exp]\"";
					completion.triggerType = TriggerSuggestType.AllAsm;
					break;
				case ".INCBIN":
					completion.insertText = completion.insertText + " \"[exp]\"";
					completion.triggerType = TriggerSuggestType.AllFile;
					break;
				case ".MACRO":
					completion.insertText = completion.insertText + " [exp]\n\n.ENDM";
					break;
				case ".DBG": case ".DWG": case ".DLG":
					completion.insertText = completion.insertText + " [exp]\n\n.ENDD";
					break;
				case ".IF": case ".IFDEF": case ".IFNDEF":
					completion.insertText = completion.insertText + " [exp]\n\n.ENDIF";
					break;
				case ".REPEAT":
					completion.insertText = completion.insertText + " [exp]\n\n.ENDR";
					break;
				case ".ORG": case ".BASE": case ".MSG": case ".DB": case ".DW": case ".DL": case ".DEF":
					completion.insertText = completion.insertText + " ";
					break;
			}

			IntellisenseProvider.commandCompletions.push(completion);
			if (!NotInMacroCommands.includes(value))
				IntellisenseProvider.commandNotInMacroCompletions.push(completion);
		});
	}
	//#endregion 更新所有编译器命令

}
