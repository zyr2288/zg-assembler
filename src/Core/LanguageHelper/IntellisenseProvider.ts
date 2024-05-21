import { Compiler } from "../Base/Compiler";
import { Config } from "../Base/Config";
import { FileUtils } from "../Base/FileUtils";
import { ILabel, ILabelTree, LabelScope, LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Commands } from "../Commands/Commands";
import { Macro } from "../Commands/Macro";
import { Localization } from "../I18n/Localization";
import { AsmCommon } from "../Platform/AsmCommon";
import { CommentHelper } from "./CommentHelper";
import { HelperUtils } from "./HelperUtils";

const ignoreWordStr = ";|(^|\\s+)(\\.HEX|\\.DBG|\\.DWG|\\.MACRO)(\\s+|$)";

enum CompletionType {
	Instruction, AddressingType, Command, Macro, Defined, Label, Variable, UnknowLabel, MacroParamter, Folder, File
}

export enum CompletionIndex {
	Folder = 0, File = 1,
	Macro = 2, Parameter = 3,
	Command = 4,
	Label = 5, Defined = 5, UnknowLabel = 5, Variable = 5,
	Instruction = 6,
	EmptyAddressing = 7, NotEmptyAddressing = 8
}

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
		index?: CompletionIndex, comment?: string,
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
	index: CompletionIndex = CompletionIndex.Folder;
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
	type: "DataGroup" | "Macro" | "Enum";
	key: string;
	startLine: number;
	endLine: number;
}

const NotInMacroCommands = [".DBG", ".DWG", ".MACRO", ".DEF", ".INCLUDE", ".INCBIN", ".ENUM"];

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
	static Intellisense(filePath: string, lineNumber: number, lineText: string, currect: number, trigger?: string): Completion[] {
		if (!Config.ProjectSetting.intellisense)
			return [];

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const line = Token.CreateToken(fileHash, lineNumber, 0, lineText);
		const prefix = line.Substring(0, currect);

		if (new RegExp(ignoreWordStr, "ig").test(prefix.text))
			return [];

		const rangeType = HelperUtils.GetRange(fileHash, lineNumber);
		let macro: Macro | undefined;
		switch (rangeType?.type) {
			case "DataGroup":
				if (trigger === " ")
					return [];

				const prefix1 = HelperUtils.GetWord(lineText, currect);
				return IntellisenseProvider.GetLabel(fileHash, prefix1.leftText);
			case "Macro":
				macro = Compiler.enviroment.allMacro.get(rangeType.key);
				break;
			case "Enum":
				if (lineNumber === rangeType.startLine)
					break;

				const comma = lineText.indexOf(",");
				if (comma < 0 || currect < comma)
					return [];

				const prefix2 = HelperUtils.GetWord(lineText, currect);
				return IntellisenseProvider.GetLabel(fileHash, prefix2.leftText, macro);
		}

		const tempMatch = HelperUtils.BaseSplit(lineText);
		if (tempMatch.type === "None" || currect < tempMatch.start)
			return IntellisenseProvider.GetEmptyLineHelper({ fileHash, range: rangeType, trigger: trigger });

		const matchIndex = tempMatch.start + tempMatch.text.length + 1;
		switch (tempMatch.type) {
			case "Instruction":
				if (trigger === " " && currect === matchIndex) {
					return IntellisenseProvider.GetInstructionAddressingModes(tempMatch.text);
				} else if (trigger === ":" && currect > matchIndex) {
					const prefix = HelperUtils.GetWord(lineText, currect);
					return IntellisenseProvider.GetDataGroup(prefix.leftText);
				} else if (trigger !== " " && currect > matchIndex) {
					const restText = lineText.substring(matchIndex);
					const tempCurrect = currect - matchIndex - 1;
					const ignoreContent = AsmCommon.MatchLinePosition(tempMatch.text, restText, tempCurrect);
					if (ignoreContent)
						return [];

					const prefix = HelperUtils.GetWord(lineText, currect);
					return IntellisenseProvider.GetLabel(fileHash, prefix.leftText, macro);
				}
				break;
			case "Command":
			case "Variable":
			case "Macro":
				if (currect < matchIndex || trigger === " ") {
					return [];
				} else if (trigger === ":" && currect > matchIndex) {
					const prefix = HelperUtils.GetWord(lineText, currect);
					return IntellisenseProvider.GetDataGroup(prefix.leftText);
				}

				const prefix = HelperUtils.GetWord(lineText, currect);
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
						const com = new Completion({
							showText: macro.name.text,
							index: CompletionIndex.Macro,
							type: CompletionType.Macro,
							insertText: IntellisenseProvider.ReplaceMacro(macro),
							comment: CommentHelper.FormatComment(macro)
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
					com.index = CompletionIndex.Folder;
					com.type = CompletionType.Folder;
					break;

				case "file":
					com.index = CompletionIndex.File;
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
		const result: Completion[] = [];
		if (macro && !prefix.endsWith(".")) {
			macro.labels.forEach((value) => {
				const com = new Completion({
					showText: value.token.text,
					index: CompletionIndex.Label
				});
				result.push(com);
			});
			macro.params.forEach((param) => {
				const com = new Completion({
					showText: param.label.token.text,
					index: CompletionIndex.Parameter,
					type: CompletionType.MacroParamter
				});
				result.push(com);
			});
		}

		const labelScope = prefix.startsWith(".") ? LabelScope.Local : LabelScope.Global;
		let index = prefix.lastIndexOf(".");
		let labelTree: Map<string, ILabelTree> | undefined;
		let labels: Map<string, ILabel> | undefined;

		if (index > 0) {
			prefix = prefix.substring(0, index);
		} else {
			prefix = "";
		}

		if (labelScope === LabelScope.Global) {
			labelTree = Compiler.enviroment.labelTree.global;
			labels = Compiler.enviroment.allLabel.global;
		} else {
			labelTree = Compiler.enviroment.labelTree.local.get(fileHash);
			labels = Compiler.enviroment.allLabel.local.get(fileHash);
		}

		labelTree?.forEach((tree, key) => {
			if (tree.parent !== prefix)
				return;

			const label = labels?.get(key);
			if (!label)
				return;

			const showText = label.token.text.substring(index + 1);
			const item = new Completion({ showText });
			switch (label.labelType) {
				case LabelType.Defined:
					item.type = CompletionType.Defined;
					item.index = CompletionIndex.Defined;
					break;
				case LabelType.Label:
					item.type = CompletionType.Label;
					item.index = CompletionIndex.Label;
					break;
				case LabelType.None:
					item.type = CompletionType.UnknowLabel;
					item.index = CompletionIndex.UnknowLabel;
					break;
				case LabelType.Variable:
					item.type = CompletionType.Variable;
					item.index = CompletionIndex.Variable;
					break;
			}
			item.comment = CommentHelper.FormatComment(label);
			result.push(item);
		});

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

		const datagroup = Compiler.enviroment.allDataGroup.get(parts[0]);
		if (!datagroup)
			return result;

		if (!parts[1]) {
			datagroup.labelAndIndex.forEach((value) => {
				for (let i = 0; i < value.length; i++) {
					result.push(new Completion({ showText: value[i].token.text }));
				}

			});
			return result;
		}


		const members = datagroup.labelAndIndex.get(parts[1]);
		if (!members)
			return result;

		for (let i = 0; i < members.length; i++) {
			const com = new Completion({ showText: i.toString() });
			result.push(com);
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
			com.type = CompletionType.AddressingType;
			if (!modes[j].addressingMode) {
				com.index = CompletionIndex.EmptyAddressing;
				com.showText = Localization.GetMessage("empty addressing mode");
				com.insertText = "\n";
			} else {
				com.index = CompletionIndex.EmptyAddressing;
				com.showText = modes[j].addressingMode!;
				com.insertText = IntellisenseProvider.ReplaceCommon(modes[j].addressingMode!);
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

			const completion = new Completion({ showText: instruction, index: CompletionIndex.Instruction, insertText, type: CompletionType.Instruction });
			IntellisenseProvider.instructionCompletions.push(completion);
		}
	}
	//#endregion 更新所有汇编指令

	//#region 更新所有编译器命令
	/**更新所有编译器命令 */
	static UpdateCommandCompletions() {
		Commands.commandNames.forEach(value => {
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
				case ".ENUM":
					completion.insertText = completion.insertText + " [exp]\n\n.ENDE";
					break;
				case ".ORG": case ".BASE": case ".MSG": case ".DB": case ".DW": case ".DL": case ".DEF": case ".HEX":
					completion.insertText = completion.insertText + " ";
					break;
			}

			completion.insertText = IntellisenseProvider.ReplaceCommon(completion.insertText);
			IntellisenseProvider.commandCompletions.push(completion);
			if (!NotInMacroCommands.includes(value))
				IntellisenseProvider.commandNotInMacroCompletions.push(completion);
		});
	}
	//#endregion 更新所有编译器命令

	//#region 处理汇编指令提示插入的内容
	private static ReplaceCommon(text: string) {
		let result = "";
		let match;

		const regx = /\[exp\]/g;
		let start = 0;
		let index = 0;
		while (match = regx.exec(text)) {
			result += text.substring(start, match.index) + `$${index}`;
			start = match.index + match[0].length;
			index++;
		}

		result += text.substring(start);
		return result;
	}
	//#endregion 处理汇编指令提示插入的内容

	//#region 处理插入Macro
	private static ReplaceMacro(macro: Macro) {
		let result = macro.name.text;
		if (macro.params.size === 0)
			return result;

		result += " ";
		let index = 1;
		macro.params.forEach(v => {
			if (index === macro.params.size)
				index = 0;

			result += `\${${index}:${v.label.token.text}}, `;
			index++;
		});
		result = result.substring(0, result.length - 2);
		return result;
	}
	//#endregion 处理插入Macro

}
