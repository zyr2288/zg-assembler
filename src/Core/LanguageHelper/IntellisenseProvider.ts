import { Compiler } from "../Base/Compiler";
import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Commands } from "../Commands/Commands";
import { IMacro } from "../Commands/Macro";
import { Platform } from "../Platform/Platform";

let fileCompletion: {
	type: ".INCLUDE" | ".INCBIN",
	path: string,
	workFolder: string,
	excludeFile: string,
};

const ignoreWordStr = /;|(^|\s+)(\.HEX|\.DBG|\.DWG|\.MACRO)(\s+|$)/ig;

//#region 提示类型
export enum CompletionType {
	Instruction, Command, Macro, Label, MacroLabel, Folder, File
}
//#endregion 提示类型

//#region 提示项
export class Completion {
	static CopyList(all: Completion[], exclude?: string[]) {
		let result: Completion[] = [];
		for (let i = 0; i < all.length; i++) {
			if (exclude?.includes(all[i].showText))
				continue;

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
	constructor(option: { showText: string, insertText?: string, index?: number, comment?: string, type?: CompletionType, tag?: any }) {
		this.showText = option.showText;
		this.insertText = option.insertText ?? option.showText;
		this.index = option.index ?? 0;
		this.comment = option.comment;
		this.type = option.type;
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

	Copy() {
		let completion = new Completion({
			showText: this.showText,
			insertText: this.insertText,
			index: this.index,
			comment: this.comment,
			type: this.type
		});
		return completion;
	}
}
//#endregion 提示项

export enum CompletionRange { None, Base, Label, Macro, Path }


//#region 智能提示类
export class IntellisenseProvider {

	private static commandCompletions: Completion[] = [];
	private static commandNotInMacroCompletions: Completion[] = [];
	private static instructionCompletions: Completion[] = [];

	static Intellisense(
		document: { filePath: string, lineNumber: number, allText: string, currect: number, lineText: string, lineCurrect: number },
		option: { trigger?: string }
	) {
		if (fileCompletion)
			return;

		let fileHash = Utils.GetHashcode(document.filePath);

		let line = Token.CreateToken(fileHash, document.lineNumber, 0, document.lineText);
		let leftText = line.Substring(0, document.lineCurrect);

		if (ignoreWordStr.test(leftText.text))
			return [];


	}

	static GetBaseHelper(type: CompletionRange, prefix: Token, option?: { macro?: IMacro, trigger?: string }) {
		let result: Completion[] = [];

		switch (type) {
			case CompletionRange.Base:
				if (option?.trigger === ".") {
					result = Completion.CopyList(
						option.macro ? IntellisenseProvider.commandNotInMacroCompletions : IntellisenseProvider.commandCompletions
					);
				} else {
					result.push(...Completion.CopyList(IntellisenseProvider.instructionCompletions));
					Compiler.enviroment.allMacro.forEach((value, key) => {
						let com = new Completion({ showText: key });
						result.push(com);
					});
				}
				break;

			case CompletionRange.Label:
				let index = prefix.text.lastIndexOf(".");
				if (index > 0) {
					prefix = prefix.Substring(0, index);
				} else if (option?.macro) {
					option.macro.labels.forEach((value, key) => {
						let com = new Completion({ showText: value.token.text });
						result.push(com);
					})
				}

				let label = LabelUtils.FindLabel(prefix);
				let topLabel = Compiler.enviroment.labelTrees.get(0);
				if (!label && index < 0 && topLabel) {
					topLabel.child.forEach((value) => {
						let temp = Compiler.enviroment.allLabel.get(value);
						if (temp) {
							let item = new Completion({ showText: temp.token.text });
							result.push(item);
						}
					})
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
			let completion = new Completion({ showText: instruction });
			IntellisenseProvider.instructionCompletions.push(completion);
		}
	}

	/**添加所有编译器命令 */
	static UpdateCommandCompletions() {

		for (let i = 0; i < Commands.allCommandNames.length; ++i) {
			const command = Commands.allCommandNames[i];
			let completion = new Completion({
				showText: command,
				insertText: command.substring(1),
				type: CompletionType.Command
			});
			IntellisenseProvider.commandCompletions.push(completion);
		}

	}


}
//#endregion 智能提示类
