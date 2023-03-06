import { Compiler } from "../Base/Compiler";
import { LabelScope, LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Commands } from "../Commands/Commands";
import { IMacro } from "../Commands/Macro";
import { Platform } from "../Platform/Platform";
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
	 * @param option.tag showText 附加数据
	 */
	constructor(option: {
		showText: string, insertText?: string,
		index?: number, comment?: string,
		type?: CompletionType, child?: Completion[], tag?: any
	}) {
		this.showText = option.showText;
		this.insertText = option.insertText ?? option.showText;
		this.index = option.index ?? 0;
		this.comment = option.comment;
		this.type = option.type;
		this.child = option.child;
		this.tag = option.tag;
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
	tag?: any;
	/**智能提示后续项目 */
	child?: Completion[];

	Copy() {
		let completion = Utils.DeepClone<Completion>(this);
		return completion;
	}
}
//#endregion 提示项

export enum CompletionRange { None, Base, Label, Macro, Path, AddressingMode }

//#region 智能提示类
export class IntellisenseProvider {

	private static commandCompletions: Completion[] = [];
	private static commandNotInMacroCompletions: Completion[] = [];
	private static instructionCompletions: Completion[] = [];
	private static fileCompletion: {
		type: ".INCLUDE" | ".INCBIN",
		path: string,
		workFolder: string,
		excludeFile: string,
	};


	static Intellisense(
		document: { filePath: string, lineNumber: number, currect: number, lineText: string, lineCurrect: number },
		option: { trigger?: string }
	) {
		if (IntellisenseProvider.fileCompletion)
			return [];

		let fileHash = Utils.GetHashcode(document.filePath);

		let line = Token.CreateToken(fileHash, document.lineNumber, 0, document.lineText);
		let leftText = line.Substring(0, document.lineCurrect);

		// 左侧忽略文本
		if (ignoreWordStr.test(leftText.text))
			return [];

		let text = HelperUtils.GetWord(document.lineText, document.lineCurrect);
		if (/[@\$]/g.test(text.text))
			return [];

		let match = new RegExp(Platform.regexString, "ig").exec(leftText.text);

		let type: CompletionRange = CompletionRange.Base;
		let helperOption = { trigger: option.trigger, macro: undefined };

		if (match?.groups?.["command"]) {
			type = CompletionRange.Label;

		} else if (match?.groups?.["instruction"]) {
			if (option.trigger === " " && leftText.text.substring(match.index + match[0].length).length === 0) {
				type = CompletionRange.AddressingMode;
				text.startColumn = match.index + text.startColumn;
				text.text = match.groups["instruction"]!.toUpperCase();
			} else {
				type = CompletionRange.Label;
			}
		}

		let word = Token.CreateToken(fileHash, document.lineNumber, text.startColumn, text.text);
		let result = IntellisenseProvider.GetBaseHelper(type, word, helperOption);
		return result;
	}

	static GetBaseHelper(type: CompletionRange, prefix: Token, option?: { macro?: IMacro, trigger?: string }) {
		let result: Completion[] = [];
		switch (type) {

			// 基础提示
			case CompletionRange.Base:
				switch (option?.trigger) {
					case " ":
						break;
					case ".":
						result = Completion.CopyList(
							option.macro ? IntellisenseProvider.commandNotInMacroCompletions : IntellisenseProvider.commandCompletions
						);
						break;
					default:
						result = Completion.CopyList(IntellisenseProvider.instructionCompletions);
						Compiler.enviroment.allMacro.forEach((value, key) => {
							let com = new Completion({ showText: key });
							result.push(com);
						});
				}
				break;

			// 获取寻址模式
			case CompletionRange.AddressingMode:
				let instructions = IntellisenseProvider.GetInstructionAddressingModes(prefix.text);
				if (!instructions)
					break;

				result = instructions;
				break;

			// 标签模式
			case CompletionRange.Label:
				let labelScope = prefix.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;
				let index = prefix.text.lastIndexOf(".");

				if (index > 0) {
					prefix = prefix.Substring(0, index);
				} else if (option?.macro) {
					option.macro.labels.forEach((value, key) => {
						let com = new Completion({ showText: value.token.text });
						result.push(com);
					});
				} else {
					prefix.text = "";
				}

				let labelHash = LabelUtils.GetLebalHash(prefix.text, prefix.fileHash, labelScope);
				let topLabel = Compiler.enviroment.labelTrees.get(labelHash);
				if (topLabel) {
					topLabel.child.forEach((value) => {
						let temp = Compiler.enviroment.allLabel.get(value);
						if (!temp)
							return;

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
				break;
		}

		return result;
	}

	/**添加所有汇编命令 */
	static UpdateInstrucionCompletions() {
		IntellisenseProvider.instructionCompletions = [];
		for (let i = 0; i < Platform.platform.instructions.length; ++i) {
			const instruction = Platform.platform.instructions[i];
			let completion = new Completion({
				showText: instruction,
				insertText: instruction,
				type: CompletionType.Instruction
			});
			IntellisenseProvider.instructionCompletions.push(completion);
		}
	}

	/**添加所有编译器命令 */
	static UpdateCommandCompletions() {

		Commands.allCommandNames.forEach(value => {
			let completion = new Completion({
				showText: value,
				insertText: value.substring(1),
				type: CompletionType.Command
			});
			IntellisenseProvider.commandCompletions.push(completion);
		});
	}

	/**获取汇编指令地址模式 */
	static GetInstructionAddressingModes(instruction: string) {
		const modes = Platform.platform.allInstructions.get(instruction)
		if (!modes)
			return;

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

}
//#endregion 智能提示类
