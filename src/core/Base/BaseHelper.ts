import { BaseLineUtils } from "../BaseLine/BaseLine";
import { Platform } from "../Platform/Platform";
import { FileUtils } from "../Utils/FileUtils";
import { LabelUtils } from "../Utils/LabelUtils";
import { LexerUtils } from "../Utils/LexerUtils";
import { MacroUtils } from "../Utils/MacroUtils";
import { Utils } from "../Utils/Utils";
import { Commands } from "./Commands";
import { Completion, CompletionType } from "./Completion";
import { Config } from "./Config";
import { GlobalVar } from "./GlobalVar";
import { LabelDefinedState, LabelState } from "./Label";
import { Macro } from "./Macro";
import { MyException } from "./MyException";
import { Token } from "./Token";

type RangeWords = "DataGroup" | "Macro";
enum CompletionRange { None, Base, Label, Macro, Path }

export class BaseHelper {

	static instructionCompletions: Completion[] = [];
	static commandsCompletions: Completion[] = [];

	static FileCompletion?: {
		type: ".INCLUDE" | ".INCBIN",
		path: string,
		workFolder: string,
		excludeFile: string,
	};

	static readonly rangeWords: Record<string, RegExp> = {
		DataGroup: /(?<=\.D[BW]G.*\r?\n)(.*\r?\n)*?(?=.*\.ENDD)/ig,
		Macro: /(?<=\.MACRO\s+)(.*\r?\n)*?(?=.*\.ENDM)/ig
	}

	private static readonly NotInMacro = [".DBG", ".DWG", ".MACRO", ".DEF", ".INCLUDE", ".INCBIN", ".BASE", ".ORG"];

	/**自动大写的文本 */
	private static autoUppercaseStr = "";
	private static ignoreWordStr = /;|(^|\s+)(\.HEX|\.DBG|\.DWG|\.MACRO)(\s+|$)/ig;

	static get ignoreWordsRegex() { return new RegExp(BaseHelper.ignoreWordStr); };
	static get uppercaseRegex() { return new RegExp(BaseHelper.autoUppercaseStr, "ig"); };

	//#region 初始化，更新基础提示
	/**初始化，更新基础提示 */
	static Initialize() {
		BaseHelper.SwitchPlatform(Config.ProjectSetting.platform);
	}
	//#endregion 初始化，更新基础提示

	//#region 切换平台，更新自动大写以及智能提示
	static SwitchPlatform(platform: string) {
		Platform.SwitchPlatform(platform);
		BaseHelper.UpdateUppercase();
		BaseHelper.UpdateCompletion();
	}
	//#endregion 切换平台，更新自动大写以及智能提示

	/***** 智能提示 *****/

	//#region 智能提示
	/**
	 * 智能提示
	 * @param document 文件Hash 行号 所有文本 当前光标 行文本 行光标
	 * @param option 该文件的路径 项目基础路径 筛选文件后缀 触发字符
	 */
	static async Intellisense(
		document: { fileHash: number, lineNumber: number, allText: string, currect: number, lineText: string, lineCurrect: number },
		option: { trigger?: string }
	): Promise<Completion[]> {
		if (BaseHelper.FileCompletion) {
			return BaseHelper.GetFilePaths(BaseHelper.FileCompletion);
		}

		let line = Token.CreateToken(document.lineText, document.fileHash, document.lineNumber, 0);
		let leftText = line.Substring(0, document.lineCurrect);

		// 左边文本有忽略内容
		if (BaseHelper.ignoreWordsRegex.test(leftText.text))
			return [];

		let text = BaseHelper.GetWord(document.lineText, document.lineCurrect);
		if (/[@\$]/g.test(text.text))
			return [];

		let helperOption = { macro: <Macro | undefined>undefined, trigger: option.trigger };
		let completionTyep: CompletionRange = CompletionRange.None;
		let range = BaseHelper.GetRange(document.allText, document.currect);
		switch (range?.match) {
			case "DataGroup":
				completionTyep = CompletionRange.Label;
				break;
			case "Macro":
				let index = range.expression.search(/\s+|\r?\n/);
				helperOption.macro = MacroUtils.FindMacro(range.expression.substring(0, index));
				completionTyep = BaseHelper.GetIntellisenseType(leftText.text);
				break;
			default:
				completionTyep = BaseHelper.GetIntellisenseType(leftText.text);
				break;
		}
		// let dataGroups = 

		let word = Token.CreateToken(text.text, document.fileHash, document.lineNumber, text.startColumn);
		let result = BaseHelper.GetHelperItem(completionTyep, word, helperOption);
		return result;
	}
	//#endregion 智能提示

	//#region 获取帮助提示文件路径
	/**
	 * 智能提示获取文件列表
	 * @param option.type 当前文件路径
	 * @param option.path 基础项目文件夹路径
	 * @param option.workFolder 文件过滤器
	 * @param option.excludeFile 排除的文件
	 * @returns 文件列表
	 */
	public static async GetFilePaths(option: { type: ".INCLUDE" | ".INCBIN", path: string, workFolder: string, excludeFile: string }) {
		let folderPath = await FileUtils.GetPathFolder(option.path);		// 获取目录
		let allPath = await FileUtils.GetFolderFiles(folderPath);			// 获取目录下所有文件
		let result: Completion[] = [];

		option.workFolder = FileUtils.ArrangePath(option.workFolder);
		if (folderPath != option.workFolder) {
			let completion = new Completion();
			completion.index = 0;
			completion.showText = completion.insertText = ".." + Config.CommonSplit;
			completion.type = CompletionType.Folder;
			let tempPath = FileUtils.Combine(folderPath, ".." + Config.CommonSplit);
			completion.tag = [option.type, tempPath];
			result.push(completion);
			option.excludeFile = "";
		} else {	// 同一个目录，排除本文件
			option.excludeFile = await FileUtils.GetFileName(option.excludeFile);
		}

		for (let i = 0; i < allPath.length; i++) {
			const path = allPath[i];
			if (path.type == "file" &&
				(option.excludeFile == path.name || option.type == ".INCLUDE" && !path.name.endsWith(`.${Config.FileExtension.extension}`)))
				continue;

			let completion = new Completion();
			if (path.type == "folder") {
				completion.index = 1;
				completion.type = CompletionType.Folder;
				completion.insertText = path.name + Config.CommonSplit;
				let tempPath = FileUtils.Combine(folderPath, path.name);
				completion.tag = [option.type, tempPath];
			} else {
				completion.index = 2;
				completion.type = CompletionType.File;
				completion.insertText = path.name;
			}
			completion.showText = path.name;

			result.push(completion);
		}

		delete (BaseHelper.FileCompletion);
		return result;
	}
	//#endregion 获取帮助提示文件路径

	//#region 获取文件已更新的行
	static GetUpdateLine(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		if (!GlobalVar.env.fileBaseLines[hash])
			return [];

		return GlobalVar.env.fileBaseLines[hash];
	}

	//#endregion 获取文件已更新的行

	/***** Label相关 *****/

	//#region 获取Label所在文件位置
	/**获取Label所在文件位置 */
	static async GetLabelSourcePosition(text: string, currect: number, lineNumber: number, filePath: string) {

		let fileHash = Utils.GetHashcode(filePath);
		let lineText = Token.CreateToken(text, fileHash, lineNumber);

		let result = { filePath: "", lineNumber: 0, startColumn: 0, length: 0 };
		const { content, comment } = BaseLineUtils.GetContent(lineText);

		let range = BaseHelper.GetWord(content.text, currect, content.startColumn);
		if (range.type == "none")
			return result;

		if (range.type == "path") {
			if (await FileUtils.PathType(range.text) == "file") {
				result.filePath = range.text;
			} else {
				let tempPath = await FileUtils.GetPathFolder(filePath);
				result.filePath = FileUtils.Combine(tempPath, range.text);
			}
			return result;
		}

		content.text = range.text;
		content.startColumn = currect - content.startColumn;
		let label = LabelUtils.FindLabel(content);
		if (label && label.labelScope != LabelState.AllParent && label.labelDefined != LabelDefinedState.None) {
			result.filePath = GlobalVar.env.GetFile(label.fileHash);
			result.lineNumber = label.lineNumber;
			result.startColumn = label.word.startColumn;
			result.length = label.word.length;
			return result;
		}

		let macro = MacroUtils.FindMacro(content.text);
		if (macro) {
			result.filePath = GlobalVar.env.GetFile(macro.name.fileHash);
			result.lineNumber = macro.name.lineNumber;
			result.startColumn = macro.name.startColumn;
			result.length = macro.name.length;
		}

		return result;
	}
	//#endregion 获取Label所在文件位置

	//#region 获取Label注释以及值
	/**获取Label注释以及值 */
	static GetLabelCommentAndValue(text: string, currect: number, lineNumber: number, filePath: string) {

		let fileHash = Utils.GetHashcode(filePath);
		let lineText = Token.CreateToken(text, fileHash, lineNumber, 0);

		let result = { value: <number | undefined>undefined, comment: <string | undefined>undefined };
		const { content } = BaseLineUtils.GetContent(lineText);

		let range = BaseHelper.GetWord(content.text, currect);
		if (range.type == "none")
			return result;

		if (range.type == "value") {
			result.value = range.value;
			return result;
		}

		if (range.type != "var") {
			return result;
		}

		content.text = range.text;
		content.startColumn = currect - content.startColumn;
		let label = LabelUtils.FindLabel(content);
		if (label) {
			if (label.labelScope == LabelState.AllParent || label.labelDefined == LabelDefinedState.None)
				return result;

			result.value = label.value;
			result.comment = label.comment;
			return result;
		}

		let macro = MacroUtils.FindMacro(content.text);
		if (macro) {
			result.comment = `${macro.comment}\n参数个数 ${macro.parameterCount}`;
		}
		return result;
	}
	//#endregion 获取Label注释以及值

	//#region 清除某个文件
	/**清除某个文件 */
	static ClearFile(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		LabelUtils.DeleteLabel(hash);
		MacroUtils.DeleteMacro(hash);
		MyException.ClearFileError(hash);
	}
	//#endregion 清除某个文件

	/***** 折叠 *****/

	//#region 获取折叠信息
	/**
	 * 获取折叠信息
	 * @param document 文本
	 * @returns 所有折叠对称行
	 */
	static ProvideFolding(document: string) {
		let allLine = document.split(/\r?\n/g);

		let start: number[] = [];
		let result: { start: number, end: number }[] = [];
		for (let i = 0; i < allLine.length; i++) {
			if (allLine[i].includes(";+")) {
				start.push(i);
			} else if (allLine[i].includes(";-")) {
				if (start.length > 0)
					result.push({ start: <number>start.pop(), end: i });

			}
		}
		return result;
	}
	//#endregion 获取折叠信息

	/***** 其它 *****/

	//#region 更改显示语言
	static ChangeDisplayLanguage(language: string) {
		MyException.ChangeLanguage(language);
	}
	//#endregion 更改显示语言

	/***** Private *****/

	//#region 获取光标所在字符
	/**
	 * 获取光标所在字符
	 * @param text 一行文本
	 * @param currect 当前光标未知
	 * @returns 
	 */
	private static GetWord(text: string, currect: number, start = 0): { startColumn: number; text: string; type: "path" | "var" | "value" | "none"; value?: number } {

		currect -= start;
		if (currect > text.length) {
			return { startColumn: currect, text: "", type: "none" };
		}

		// 获取文件
		let preMatch = /(^|\s+)\.INC(LUDE|BIN)\s+".*?"/ig.exec(text);
		if (preMatch) {
			let index = preMatch[0].indexOf("\"");
			return {
				startColumn: preMatch.index + index,
				text: preMatch[0].substring(index + 1, preMatch[0].length - 1),
				type: "path"
			};
		}

		let leftMatch = BaseHelper.uppercaseRegex.exec(text.substring(0, currect));
		let rightMatch = BaseHelper.uppercaseRegex.exec(text);

		let temp: RegExpExecArray | null;
		if (rightMatch && currect <= rightMatch.index && (temp = /^\s*(\++|\-+)/.exec(text.substring(0, rightMatch.index)))) {
			// 临时变量
			return { startColumn: temp.index, text: temp[0], type: "var" };
		} else if (leftMatch && (temp = /^\s*(\++|\-+)/.exec(text.substring(leftMatch.index + leftMatch[0].length))) != null) {
			// 临时变量
			return { startColumn: leftMatch.index + leftMatch[0].length, text: temp[0], type: "var" };
		} else {
			let left = Utils.StringReverse(text.substring(0, currect));
			let right = text.substring(currect);

			const regexStr = "\\s|\\<|\\>|\\+|\\-|\\*|\\/|\\,|\\(|\\)|\\=|\\#|&|\\||\\^|$";

			let m1 = <RegExpExecArray>new RegExp(regexStr, "g").exec(left);
			let m2 = <RegExpExecArray>new RegExp(regexStr, "g").exec(right);

			let leftIndex = left.length - m1.index;
			left = Utils.StringReverse(left.substring(0, m1.index));
			right = right.substring(0, m2.index);

			let resultText = left + right;
			let number = LexerUtils.GetNumber(resultText);
			if (number.success)
				return { startColumn: leftIndex, text: resultText, type: "value", value: number.value };

			return { startColumn: leftIndex, text: resultText, type: "var" };
		}
	}
	//#endregion 获取光标所在字符

	//#region 大写的正则表达式
	private static UpdateUppercase() {
		BaseHelper.autoUppercaseStr = "(^|\\s+)(";

		Platform.instructionAnalyser.allKeyword.forEach(value => BaseHelper.autoUppercaseStr += `${value}|`);

		for (let key in Commands.allCommands) {
			let com = Commands.allCommands[key];
			BaseHelper.autoUppercaseStr += `\\${com.startCommand}|`;
			if (com.endCommand)
				BaseHelper.autoUppercaseStr += `\\${com.endCommand}|`;
		}

		BaseHelper.autoUppercaseStr = BaseHelper.autoUppercaseStr.substring(0, BaseHelper.autoUppercaseStr.length - 1);
		BaseHelper.autoUppercaseStr += ")(\\s+|$)";
	}
	//#endregion 大写的正则表达式

	//#region 基础编译指令
	/**
	 * 基础编译指令
	 */
	private static UpdateCompletion() {
		BaseHelper.instructionCompletions = [];

		Platform.instructionAnalyser.allKeyword.forEach(value => {
			let completion = new Completion();
			completion.showText = value;
			if (Platform.instructionAnalyser.instructionCodeLengthMax[value] == 0)
				completion.insertText += value + "\r\n";
			else
				completion.insertText = value + " ";

			completion.index = 1;
			completion.type = CompletionType.Instruction;
			BaseHelper.instructionCompletions.push(completion);
		});

		BaseHelper.commandsCompletions = [];
		for (let key in Commands.allCommands) {
			let completion = new Completion();

			let com = Commands.allCommands[key];
			completion.showText = com.startCommand;
			completion.insertText = com.startCommand;
			completion.index = 1;
			completion.type = CompletionType.Command;

			if (Commands.commandsParamsCount[key].max != 0)
				completion.insertText += " ";

			if (com.endCommand) {
				completion.insertText += `\n\n${com.endCommand}`;

				let completion2 = new Completion();
				completion2.showText = com.endCommand;
				completion2.insertText = com.endCommand;
				completion2.index = 1;
				completion2.type = CompletionType.Command;
				BaseHelper.AddCommandCompletion(completion2);
			}

			BaseHelper.AddCommandCompletion(completion);

			if (com.includeCommand) {
				com.includeCommand.forEach(value => {
					let completion = new Completion();
					completion.showText = value.name;
					completion.insertText = value.name;
					completion.type = CompletionType.Command;
					BaseHelper.AddCommandCompletion(completion);
				});
			}
		}
	}
	//#endregion 基础编译指令

	//#region 获取区间
	/**
	 * 获取匹配区间
	 * @param allText 所有文本
	 * @param currect 当前光标位置
	 * @returns 满足的Key
	 */
	private static GetRange(allText: string, currect: number) {
		for (let key in BaseHelper.rangeWords) {
			let regex = new RegExp(BaseHelper.rangeWords[key]);
			let matches = Utils.GetTextMatches(regex, allText);
			for (let i = 0; i < matches.length; i++) {
				const match = matches[i];
				if (currect >= match.index && currect < match.index + match.match.length) {
					return { match: <RangeWords>key, expression: match.match };
				}
			}
		}
	}
	//#endregion 获取区间

	//#region 获取帮助类型
	private static GetIntellisenseType(prefix: string): CompletionRange {
		let match = BaseHelper.uppercaseRegex.exec(prefix)
		if (!match) {
			if (prefix.includes("="))		// 若没有命令且前有等号
				return CompletionRange.Label;

			return CompletionRange.Base;
		}

		let command = match[0].trim().toUpperCase();
		if (Platform.instructionAnalyser.allKeyword.includes(command) && prefix.includes(",")) {
			return CompletionRange.None;
		}

		switch (command) {
			case ".DEF": {
				let temp = prefix.substring(match.index + match[0].length);
				if (/^.+\s+/g.test(temp)) {
					return CompletionRange.Label;
				} else {
					return CompletionRange.None;
				}
			}
			default:
				return CompletionRange.Label;
		}
	}
	//#endregion 获取帮助类型

	//#region 获取帮助条目
	/**
	 * 获取帮助条目
	 * @param type 提示类型
	 * @param prefix 前缀
	 * @param option 区间词汇
	 * @returns 
	 */
	private static GetHelperItem(type: CompletionRange, prefix: Token, option?: { macro?: Macro, trigger?: string }) {
		let result: Completion[] = [];

		switch (type) {
			case CompletionRange.Base:
				switch (option?.trigger) {
					case ".":
						if (option.macro)
							result = Completion.CopyList(BaseHelper.commandsCompletions, BaseHelper.NotInMacro);
						else
							result = Completion.CopyList(BaseHelper.commandsCompletions);

						break;
					default:
						result = Completion.CopyList(BaseHelper.instructionCompletions);
						for (let key in GlobalVar.env.allMacro) {
							let com = new Completion();
							com.index = 0;
							com.insertText = GlobalVar.env.allMacro[key].name.text;
							com.showText = GlobalVar.env.allMacro[key].name.text;
							result.push(com);
						}
						break;
				}
				break;
			case CompletionRange.Label:
				let index = prefix.text.lastIndexOf(".");
				if (index > 0) {
					prefix = prefix.Substring(0, index);
				} else if (option?.macro) {
					for (let key in option.macro.labels) {
						let label = option.macro.labels[key];
						let item = new Completion();
						item.showText = label.keyword.text;
						item.insertText = label.keyword.text;
						item.index = 0;
						item.type = CompletionType.MacroLabel;
						result.push(item);
					}
				}

				let label = LabelUtils.FindLabel(prefix);
				if (!label && index < 0 && GlobalVar.env.allLabels[0]) {	// 全局变量
					var labels = GlobalVar.env.allLabels[0].child;
					for (let key in labels) {
						label = labels[key];

						let item = new Completion();
						item.showText = label.keyword.text;
						item.insertText = label.keyword.text;
						item.comment = label.comment;
						item.index = 1;
						result.push(item);
					}
				} else if (label?.child) {									// 局部变量
					for (let key in label.child) {
						let item = new Completion();
						item.showText = label.child[key].keyword.text;
						item.insertText = label.child[key].keyword.text;
						item.comment = label.child[key].comment;
						item.index = 1;
						result.push(item);
					}
				}
				break;
		}

		return result;
	}
	//#endregion 获取帮助条目

	//#region 添加命令提示
	private static AddCommandCompletion(completion: Completion) {
		let index = BaseHelper.commandsCompletions.findIndex(value => {
			return value.showText == completion.showText
		});

		if (index < 0)
			BaseHelper.commandsCompletions.push(completion);
	}
	//#endregion 添加命令提示

}