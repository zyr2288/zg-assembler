import { Compiler } from "../Base/Compiler";
import { Config } from "../Base/Config";
import { FileUtils } from "../Base/FileUtils";
import { ILabel, LabelScope, LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Commands } from "../Commands/Commands";
import { IMacro, MacroUtils } from "../Commands/Macro";
import { AsmCommon } from "../Platform/AsmCommon";
import { MatchNames, Platform } from "../Platform/Platform";
import { HelperUtils } from "./HelperUtils";

const ignoreWordStr = /;|(^|\s+)(\.HEX|\.DBG|\.DWG|\.MACRO)(\s+|$)/ig;

//#region 提示类型
enum CompletionType {
	Instruction, Command, Macro, Defined, Label, MacroLabel, Folder, File
}
//#endregion 提示类型

//#region 提示项
export class Completion {
	static CopyList(all: Completion[]) {
		let result: Completion[] = [];
		for (let i = 0; i < all.length; i++) {
			result.push(all[i]);
		}
		return result;
	}

	//#region 构造函数
	/**
	 * 构造函数
	 * @param option.showText showText 显示的文本
	 * @param option.insertText showText 插入的文本，默认与显示一致
	 * @param option.index showText 排序Index，默认0
	 * @param option.comment showText 注释
	 * @param option.type showText 提示类型，默认空
	 * @param option.command showText 附加数据
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

interface HightlightRange {
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

	private static commandCompletions: Completion[] = [];
	private static commandNotInMacroCompletions: Completion[] = [];
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

		const fileHash = Utils.GetHashcode(filePath);
		const line = Token.CreateToken(fileHash, lineNumber, 0, lineText);
		const prefix = line.Substring(0, lineCurrect);
		if (ignoreWordStr.test(prefix.text))
			return [];

		let rangeType = HelperUtils.GetRange(fileHash, lineNumber);
		let macro: IMacro | undefined;
		switch (rangeType?.type) {
			case "DataGroup":
				if (trigger === " ")
					return [];

				let prefix = HelperUtils.GetWord(lineText, lineCurrect);
				return IntellisenseProvider.GetLabel(fileHash, prefix.rangeText[0]);
			case "Macro":
				macro = Compiler.enviroment.allMacro.get(rangeType.key);
				break;
		}

		let tempMatch = HelperUtils.BaseSplit(lineText);
		if (tempMatch.type === "none" || lineCurrect < tempMatch.start)
			return IntellisenseProvider.GetEmptyLineHelper({ fileHash, range: rangeType, trigger: trigger });

		let matchIndex = tempMatch.start + tempMatch.text.length + 1;
		if (tempMatch.type === "instruction") {
			if (trigger === " " && lineCurrect === matchIndex) {
				return IntellisenseProvider.GetInstructionAddressingModes(tempMatch.text);
			} else if (trigger === ":" && lineCurrect > matchIndex) {
				let prefix = HelperUtils.GetWord(lineText, lineCurrect);
				return IntellisenseProvider.GetDataGroup(prefix.rangeText[0]);
			} else if (trigger !== " " && lineCurrect > matchIndex) {
				let prefix = HelperUtils.GetWord(lineText, lineCurrect);
				return IntellisenseProvider.GetLabel(fileHash, prefix.rangeText[0], macro);
			}
		} else if (tempMatch.type === "command") {
			if (lineCurrect < matchIndex || trigger === " ") 
				return [];
			
			let prefix  = HelperUtils.GetWord(lineText, lineCurrect);
			return IntellisenseProvider.GetLabel(fileHash, prefix.rangeText[0], macro);
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
	private static GetEmptyLineHelper(option: { fileHash: number, range?: HightlightRange, trigger?: string, macro?: IMacro }): Completion[] {
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
					return IntellisenseProvider.instructionCompletions;
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
	private static GetLabel(fileHash: number, prefix: string, macro?: IMacro): Completion[] {
		let result: Completion[] = [];
		if (macro) {

			const GetCompletion = (value: ILabel) => {
				let com = new Completion({ showText: value.token.text });
				result.push(com);
			}

			macro.labels.forEach(GetCompletion);
			macro.params.forEach(GetCompletion);
		}

		let labelHashes = Compiler.enviroment.fileLabels.get(fileHash);
		if (!labelHashes)
			return result;

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
				let temp = Compiler.enviroment.allLabel.get(labelHash);
				if (!temp)
					return [];

				let showText = temp.token.text.substring(index + 1);
				let item = new Completion({ showText });
				switch (temp.labelType) {
					case LabelType.Defined:
						item.type = CompletionType.Defined;
						break;
					case LabelType.Label:
						item.type = CompletionType.Label;
						break;
				}
				result.push(item);
			});
		}

		return result;
	}
	//#endregion 获取Label

	//#region 获取Datagrou
	private static GetDataGroup(prefix: string): Completion[] {
		let result: Completion[] = [];
		let parts = prefix.split(/\s*:\s*/, 2);
		if (!parts[0])
			return result;

		let hash = Utils.GetHashcode(parts[0]);
		let datagroup = Compiler.enviroment.allDataGroup.get(hash);
		if (!datagroup)
			return result;

		if (!parts[1]) {
			datagroup.labelHashAndIndex.forEach((value, key) => {
				let label = Compiler.enviroment.allLabel.get(key);
				if (!label)
					return;

				let com = new Completion({
					showText: label.token.text,
					insertText: label.token.text
				});
				result.push(com);
			});
			return result;
		}


		hash = Utils.GetHashcode(parts[1]);
		let numbers = datagroup.labelHashAndIndex.get(hash);
		if (!numbers)
			return result;

		for (let i = 0; i < numbers.length; ++i) {
			let com = new Completion({ showText: i.toString() });
			result.push(com);
		}
		return result;
	}
	//#endregion 获取Datagrou

	/***** 更新基础帮助 *****/

	//#region 获取汇编指令地址模式
	/**获取汇编指令地址模式 */
	private static GetInstructionAddressingModes(instruction: string) {
		const modes = AsmCommon.allInstructions.get(instruction.toUpperCase());
		if (!modes)
			return [];

		let completions: Completion[] = [];
		for (let j = 0; j < modes.length; ++j) {
			let com = new Completion({ showText: "" });
			if (!modes[j].addressingMode) {
				com.showText = "(Empty)";
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
			let completion = new Completion({
				showText: instruction,
				insertText: instruction,
				type: CompletionType.Instruction
			});
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
			}

			IntellisenseProvider.commandCompletions.push(completion);
			if (!NotInMacroCommands.includes(value))
				IntellisenseProvider.commandNotInMacroCompletions.push(completion);
		});
	}
	//#endregion 更新所有编译器命令

}
