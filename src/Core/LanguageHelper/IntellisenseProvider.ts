import { Compiler } from "../Compiler/Compiler";
import { Config } from "../Base/Config";
import { FileUtils } from "../Base/FileUtils";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Macro } from "../Base/Macro";
import { ILabelCommon, ILabelTree, LabelScope, LabelType, LabelUtils } from "../Base/Label";
import { HelperUtils } from "./HelperUtils";
import { HighlightRange } from "../Lines/CommonLine";
import { Platform } from "../Platform/Platform";
import { Command } from "../Command/Command";
import { Analyser } from "../Compiler/Analyser";
import { Localization } from "../I18n/Localization";

type IntellisenseTrigger = " " | "." | ":" | "/";

const ignoreWordStr = ";|(^|\\s+)(\\.HEX|\\.DBG|\\.DWG|\\.MACRO)(\\s+|$)";
const NotInMacroCommands = [".DBG", ".DWG", ".MACRO", ".DEF", ".INCLUDE", ".INCBIN", ".ENUM"];

enum CompletionType {
	Instruction,
	AddressingType,
	Command,
	Macro,
	Defined,
	Label,
	Variable,
	UnknowLabel,
	MacroParamter,
	Folder,
	File
}

export enum CompletionIndex {
	Folder = 0, File = 1,
	Macro = 2, Parameter = 3,
	Command = 4,
	Label = 5, Defined = 5, UnknowLabel = 5, Variable = 5,
	Instruction = 6,
	EmptyAddressing = 7, NotEmptyAddressing = 8
}

enum TriggerSuggestType {
	None, AllAsm, AllFile
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
		type?: CompletionType, suggestType?: TriggerSuggestType
	}) {
		this.showText = option.showText;
		this.insertText = option.insertText ?? option.showText;
		this.index = option.index ?? 0;
		this.comment = option.comment;
		this.type = option.type;
		this.triggerType = option.suggestType;
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

export class IntellisenseProvider {

	/**编译器命令提示 */
	private static commandCompletions: Completion[] = [];

	/**在Macro里的命令提示 */
	private static commandNotInMacroCompletions: Completion[] = [];

	/**汇编指令提示类 */
	private static instructionCompletions: Completion[] = [];

	/***** 基础 *****/

	//#region 基础智能提示
	/**
	 * 基础智能提示
	 * @param option.filePath 文件路径
	 * @param option.lineNumber 行号
	 * @param option.lineText 行文本
	 * @param option.current 当前光标位置
	 * @param option.trigger 触发字符
	 * @returns 
	 */
	static async Intellisense(option: { filePath: string, lineNumber: number, lineText: string, current: number, trigger?: string }): Promise<Completion[]> {
		if (!Config.ProjectSetting.intellisense)
			return [];

		const fileIndex = Compiler.enviroment.GetFileIndex(option.filePath, false);

		const lineToken = new Token(option.lineText, { line: option.lineNumber });
		const prefix = lineToken.Substring(0, option.current).Trim();

		if (new RegExp(ignoreWordStr, "ig").test(prefix.text))
			return [];

		let macro: Macro | undefined;

		//#region 特殊区域处理
		const rangeType = Compiler.enviroment.GetRange(fileIndex, option.lineNumber);
		switch (rangeType?.type) {
			case "dataGroup":
				if (option.trigger === " ")
					return [];

				const prefix1 = HelperUtils.GetWord(option.lineText, option.current);
				return IntellisenseProvider.GetLabel(fileIndex, prefix1.leftText);
			case "enum":
				if (option.lineNumber === rangeType.startLine)
					break;

				const comma = option.lineText.indexOf(",");
				if (comma < 0 || option.current < comma)
					return [];

				const prefix2 = HelperUtils.GetWord(option.lineText, option.current);
				return IntellisenseProvider.GetLabel(fileIndex, prefix2.leftText);
			case "macro":
				macro = Compiler.enviroment.allMacro.get(rangeType.key);
				break;
		}
		//#endregion 特殊区域处理

		const orgToken = Analyser.GetContent(lineToken);
		const match = HelperUtils.MatchLine(orgToken.content);
		switch (match.key) {
			case "unknow":
				return IntellisenseProvider.GetEmptyLineHelper(
					fileIndex,
					{ range: rangeType, trigger: option.trigger, currect: option.current, preText: match.org }
				);
			case "instruction":
				return IntellisenseProvider.ProcessInstruction(match.content!, fileIndex, option.current, macro, option.trigger);
			case "command":
				return await IntellisenseProvider.ProcessCommand(match.content!, fileIndex, option.current, macro, option.trigger);
			case "macro":
			case "variable":
				if (option.current < match.content!.main.start)
					break;

				const prefix = HelperUtils.GetWord(match.content!.rest.text, option.current, match.content!.rest.start);
				return IntellisenseProvider.GetLabel(fileIndex, prefix.leftText, macro);
		}

		return [];
	}
	//#endregion 基础智能提示

	//#region 获取文件帮助
	/**获取文件帮助 */
	static async GetFileHelper(topRoot: string, path: string, fileFilter: TriggerSuggestType, excludeFile: string) {

		const completions: Completion[] = [];
		if (!FileUtils.ReadFile)
			return [];

		topRoot = FileUtils.ArrangePath(topRoot);
		path = FileUtils.ArrangePath(path);

		const folder = await FileUtils.GetPathFolder(path);

		const exFileName = await FileUtils.GetFileName(excludeFile);
		const sameFolder = (await FileUtils.GetPathFolder(excludeFile)) === folder;

		if (topRoot !== folder) {
			const com = new Completion({ showText: "..", insertText: "..", index: 0 });
			com.type = CompletionType.Folder;
			completions.push(com);
		}

		const files = await FileUtils.GetFolderFiles(folder);
		for (let i = 0; i < files.length; ++i) {
			if ((sameFolder && files[i].name === exFileName) ||
				(fileFilter === TriggerSuggestType.AllAsm && files[i].type === "file" && !files[i].name.endsWith(".asm")))
				continue;

			const com = new Completion({ showText: "" });
			switch (files[i].type) {

				case "folder":
					com.index = CompletionIndex.Folder;
					com.type = CompletionType.Folder;
					com.triggerType = fileFilter;
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

	//#region 更新所有编译器命令
	/**更新所有编译器命令 */
	static UpdateCommandCompletions() {
		Command.commandMap.forEach((value, command) => {
			let completion = new Completion({
				showText: command,
				insertText: command.substring(1),
				type: CompletionType.Command
			});

			switch (command) {
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
			if (!NotInMacroCommands.includes(command))
				IntellisenseProvider.commandNotInMacroCompletions.push(completion);
		});
	}
	//#endregion 更新所有编译器命令

	/***** private *****/

	//#region 获取Label
	/**
	 * 获取Label
	 * @param fileIndex 文件Hash
	 * @param prefix 前缀
	 * @param macro 自定义函数
	 * @returns 
	 */
	private static GetLabel(fileIndex: number, prefix: string, macro?: Macro): Completion[] {
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
		let labels: Map<string, ILabelCommon> | undefined;

		if (index > 0) {
			prefix = prefix.substring(0, index);
		} else {
			prefix = "";
		}

		if (labelScope === LabelScope.Global) {
			labelTree = Compiler.enviroment.labelTree.global;
			labels = Compiler.enviroment.allLabel.global;
		} else {
			labelTree = Compiler.enviroment.labelTree.local.get(fileIndex);
			labels = Compiler.enviroment.allLabel.local.get(fileIndex);
		}

		labelTree?.forEach((tree, key) => {
			if (tree.parent !== prefix)
				return;

			const label = labels?.get(key);
			if (!label)
				return;

			const showText = label.token.text.substring(index + 1);
			const item = new Completion({ showText });
			switch (label.type) {
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
			item.comment = HelperUtils.FormatComment(label);
			result.push(item);
		});

		return result;
	}
	//#endregion 获取Label

	//#region 获取空行帮助
	/**
	 * 获取空行帮助
	 * @param fileIndex 文件编号
	 * @param option.range 高亮区间
	 * @param option.trigger 触发字符串
	 */
	private static GetEmptyLineHelper(fileIndex: number, option: { range?: HighlightRange, trigger?: string, currect: number, preText: Token }): Completion[] {
		switch (option?.trigger) {
			case " ":
			case ":":
				return [];
			case ".":
				const words = HelperUtils.GetWord(option.preText.text, option.currect, option.preText.start);
				if (words.leftText.endsWith(".")) {
					const temp = words.leftText.substring(0, words.leftText.length - 1).toUpperCase();
					if (Platform.instructions.has(temp)) {
						const completions: Completion[] = [];
						const filterInstruction = IntellisenseProvider.instructionCompletions.filter(v => v.showText !== temp && v.showText.startsWith(temp));
						filterInstruction.forEach(ins => {
							const com = new Completion({
								showText: ins.showText,
								index: CompletionIndex.Instruction,
								type: CompletionType.Instruction,
								insertText: ins.showText.substring(temp.length + 1)
							});
							completions.push(com);
						});
						return completions;
					}
				}

				switch (option.range?.type) {
					case "macro":
						return IntellisenseProvider.commandNotInMacroCompletions;
					case "dataGroup":
						return IntellisenseProvider.GetLabel(fileIndex, "");
					default:
						return IntellisenseProvider.commandCompletions;
				}
			default:
				if (option?.range?.type === "dataGroup") {
					return IntellisenseProvider.GetLabel(fileIndex, "");
				} else {
					const completions: Completion[] = [];
					completions.push(...IntellisenseProvider.instructionCompletions, ...IntellisenseProvider.AddAllMacros());
					return completions;
				}
		}
	}

	private static AddAllMacros() {
		const completions: Completion[] = [];
		Compiler.enviroment.allMacro.forEach((macro) => {
			const com = new Completion({
				showText: macro.name.text,
				index: CompletionIndex.Macro,
				type: CompletionType.Macro,
				insertText: IntellisenseProvider.ReplaceMacro(macro),
				comment: HelperUtils.FormatComment({ macro })
			});
			completions.push(com);
		});
		return completions;
	}
	//#endregion 获取空行帮助

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

	/***** 关于汇编 *****/

	//#region 更新所有汇编指令
	/**更新所有汇编指令 */
	static UpdateInstruction() {
		IntellisenseProvider.instructionCompletions = [];

		Platform.instructions.forEach((addMode, instruction) => {
			let insertText = instruction;
			if (addMode.length === 1 && !addMode[0].addressingMode) {
				insertText += "\n";
			}

			const completion = new Completion({
				showText: instruction,
				insertText,
				index: CompletionIndex.Instruction,
				type: CompletionType.Instruction,
			});
			IntellisenseProvider.instructionCompletions.push(completion);
		});
	}
	//#endregion 更新所有汇编指令

	//#region 获取汇编指令的寻址方式
	/**
	 * 获取汇编指令地址模式
	 * @param instruction 汇编指令
	 * @returns 
	 */
	static GetInstructionAddressingModes(instruction: string) {
		const modes = Platform.instructions.get(instruction.toUpperCase());
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
	//#endregion 获取汇编指令的寻址方式

	//#region 处理汇编指令
	/**
	 * 处理汇编指令
	 * @param current 当前光标位置
	 * @param content 内容分割
	 */
	private static ProcessInstruction(
		content: { pre: Token, main: Token, rest: Token },
		fileIndex: number, current: number, macro?: Macro, trigger?: string): Completion[] {
		const length = content.main.start + content.main.length;
		if (current < length)
			return [];

		if (trigger === " " && current === length + 1) {
			return IntellisenseProvider.GetInstructionAddressingModes(content.main.text);
		}

		if (!trigger || trigger === ".") {
			const addrMode = Platform.MatchAddressingMode(content.main, content.rest);
			if (addrMode) {
				if (!HelperUtils.CurrentInToken(current, ...addrMode.exprs)) {
					return [];
				}
			}

			const prefix = HelperUtils.GetWord(content.rest.text, current, content.rest.start);
			return IntellisenseProvider.GetLabel(fileIndex, prefix.leftText, macro);
		}

		if (trigger === ":") {
			const prefix = HelperUtils.GetWord(content.rest.text, current, content.rest.start);
			return IntellisenseProvider.ProcessDataGroup(prefix.leftText);
		}

		return [];
	}
	//#endregion 处理汇编指令

	/***** 关于命令 *****/

	//#region 处理命令
	private static async ProcessCommand(
		content: { pre: Token, main: Token, rest: Token },
		fileIndex: number, current: number, macro?: Macro, trigger?: string): Promise<Completion[]> {

		let result: Completion[] = [];
		let temp;
		const com = content.main.text.toUpperCase();
		switch (com) {
			case ".INCLUDE":
			case ".INCBIN":
				temp = await IntellisenseProvider.ProcessInclude(com === ".INCBIN", trigger === "/", content.rest, current, fileIndex);
				if (temp)
					result = temp;

				break;
			default:
				if (!trigger || trigger === ".") {
					const prefix = HelperUtils.GetWord(content.rest.text, current, content.rest.start);
					result = IntellisenseProvider.GetLabel(fileIndex, prefix.leftText, macro);
				} else if (trigger === ":") {
					const prefix = HelperUtils.GetWord(content.rest.text, current, content.rest.start);
					result = IntellisenseProvider.ProcessDataGroup(prefix.leftText);
				}
				break;
		}

		return result;
	}
	//#endregion 处理命令

	//#region .INCLUDE命令
	private static async ProcessInclude(isIncbin: boolean, isTrigger: boolean, rest: Token, current: number, fileIndex: number) {
		let tokens = Analyser.SplitComma(rest);
		if (!tokens)
			return;

		if (tokens[0].isEmpty)
			return;

		let temp;
		temp = Analyser.SplitComma(tokens[0]);
		if (!temp || !temp[0].text.startsWith("\"") || !temp[0].text.endsWith("\""))
			return;

		temp[0] = temp[0].Substring(1, temp[0].length - 2);
		const index = HelperUtils.CurrentInToken(current, ...temp);
		switch (index?.index) {
			case 0:
				if (isTrigger) {
					const type = isIncbin ? TriggerSuggestType.AllFile : TriggerSuggestType.AllAsm;
					const currentFile = Compiler.enviroment.GetFilePath(fileIndex);
					const root = await FileUtils.GetPathFolder(currentFile);
					temp = temp[0].Substring(0, current - temp[0].start - 1);
					temp = FileUtils.Combine(root, temp.text);
					if (await FileUtils.PathType(temp) !== "path")
						break;

					return await IntellisenseProvider.GetFileHelper(root, temp, type, currentFile);
				}
				break;
			case 1:
			case 2:
				break;
		}
		return;
	}
	//#endregion .INCLUDE命令

	//#region 处理数据组
	private static ProcessDataGroup(text: string): Completion[] {
		let str = text.substring(0, text.length - 1);
		const parts = str.split(/\:/g);
		if (parts.length > 2)
			return [];

		const datagroup = Compiler.enviroment.allDataGroup.get(parts[0]);
		if (!datagroup)
			return [];

		let result: Completion[] = [];

		if (parts.length === 1) {
			datagroup.labelAndIndex.forEach((value, key) => {
				result.push(new Completion({ showText: key }));
			});
		} else {
			const indexes = datagroup.labelAndIndex.get(parts[1]);
			if (!indexes)
				return [];

			for (const index of indexes)
				result.push(new Completion({ showText: index.index.toString() }));
		}

		return result;
	}
	//#endregion 处理数据组

}