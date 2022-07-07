import { BaseLineType, BaseLineUtils } from "../BaseLine/BaseLine";
import { CommandLine } from "../BaseLine/CommandLine";
import { InstructionLine } from "../BaseLine/InstructionLine";
import { MacroLine } from "../BaseLine/MacroLine";
import { FileUtils } from "../Utils/FileUtils";
import { LabelUtils } from "../Utils/LabelUtils";
import { LexerUtils, LexPart, PriorityState } from "../Utils/LexerUtils";
import { MacroUtils } from "../Utils/MacroUtils";
import { Utils } from "../Utils/Utils";
import { CommonOption } from "./CommonOption";
import { Compile } from "./Compile";
import { DataGroup } from "./DataGroup";
import { GlobalVar } from "./GlobalVar";
import { LabelDefinedState } from "./Label";
import { Macro } from "./Macro";
import { ErrorLevel, ErrorType, MyException } from "./MyException";
import { Token, TokenType } from "./Token";

interface CommandParams {
	/**第一阶段，基础分析 */
	FirstAnalyse?: (option: CommonOption) => Promise<boolean> | boolean;
	/**第二阶段 */
	SecondAnalyse?: (option: CommonOption) => Promise<boolean> | boolean;
	/**第三阶段，分析标签 */
	ThirdAnalyse?: (compileOption: CommonOption) => Promise<boolean> | boolean;
	/**命令编译 */
	CommandCompile?: (option: CommonOption) => Promise<boolean> | boolean;

	startCommand: string;
	includeCommand?: IncludeCommand[];
	endCommand?: string;
	nested: boolean;
	enableLabel: boolean;
	enableInMacro: boolean;
}

interface IncludeCommand {
	name: string;
	min: number;
	max?: number;
}

interface MatchLine {
	match: string;
	index: number;
}

interface ConfidentLine {
	index: number;
	confident: boolean;
}

export class Commands {

	/**命令的参数个数最小与最大，key是命令 */
	static commandsParamsCount: Record<string, { min: number, max: number }> = {};

	/**命令参数内容，key是命令 */
	static allCommands: Record<string, CommandParams> = {};

	/**获取匹配命令的正则表达式 */
	static get commandsRegex() { return new RegExp(Commands.commandsRegexStr, "ig"); }

	/**匹配命令的正则表达式字符串 */
	private static commandsRegexStr: string = "";

	/**要忽略的结尾命令 */
	private static ignoreEndCom: string[] = [];

	//#region 初始化命令
	static Initialize() {
		Commands.AddAllCommands();
		Commands.GetCommandRegexStr();
	}
	//#endregion 初始化命令

	/***** 三次分析 *****/

	//#region 第一次分析
	/**第一次分析 */
	static async FirstAnalyse(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		if (Commands.ignoreEndCom.includes(line.keyword.text))
			return true;

		let com = Commands.allCommands[line.keyword.text];
		if (option.macro && !com.enableInMacro) {
			line.errorLine = true;
			MyException.PushException(line.keyword, ErrorType.CommandNotInMacro, ErrorLevel.ShowAndBreak);
			return false;
		}

		// 寻找匹配结尾
		if (com.endCommand) {
			let includeLines = Commands.FindNextMatchCommand(com.startCommand, com.endCommand, com.nested, option, com.includeCommand);
			if (includeLines.length == 0) {
				line.errorLine = true;
				MyException.PushException(line.keyword, ErrorType.CommandNotClosed, ErrorLevel.ShowAndBreak);
				return false;
			}

			option.includeCommandLines = includeLines;
			for (let i = 1; i < includeLines.length; i++) {
				Commands.AnalyseParams(<CommandLine>option.allLine[includeLines[i].index]);
				option.allLine[includeLines[i].index].errorLine = true;
			}

		}

		let args = Commands.AnalyseParams(line);
		if (!args)
			return false;


		option.tag = args;

		// 命令不允许有标签
		if (line.label?.isNull == false) {
			if (!com.enableLabel) {
				line.errorLine = true;
				MyException.PushException(line.label, ErrorType.CommandNotSupportLabel, ErrorLevel.Show);
				delete (line.label);
				return false;
			} else {
				let label = LabelUtils.CreateLabel(line.label, undefined, line.comment);
				if (label) label.labelDefined = LabelDefinedState.Label;
			}
		}

		if (Commands.allCommands[line.keyword.text].FirstAnalyse)
			return await Commands.allCommands[line.keyword.text].FirstAnalyse!(option);

		return true;
	}
	//#endregion 第一次分析

	//#region 第二次分析
	static async SecondAnalyse(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		if (Commands.ignoreEndCom.includes(line.keyword.text))
			return true;

		if (Commands.allCommands[line.keyword.text].SecondAnalyse)
			return await Commands.allCommands[line.keyword.text].SecondAnalyse!(option);

		return true;
	}
	//#endregion 第二次分析

	//#region 第三次分析
	static async ThirdAnalyse(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		if (Commands.ignoreEndCom.includes(line.keyword.text))
			return true;

		if (Commands.allCommands[line.keyword.text].ThirdAnalyse)
			await Commands.allCommands[line.keyword.text].ThirdAnalyse!(option);

		return true;
	}
	//#endregion 第三次分析

	//#region 分析命令
	/**分析命令 */
	static async CompileCommands(option: CommonOption): Promise<boolean> {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let temp = Commands.allCommands[line.keyword!.text].CommandCompile;
		if (temp)
			return await temp(option);

		return true;
	}
	//#endregion 分析命令

	/***** 通用分析 *****/

	//#region 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令
	/**
	 * 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令，将分割结果放入tag
	 * @param option 通用选项
	 */
	private static async FirstAnalyse_Common(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		let temp = LexerUtils.SplitAndSort(line.expression);
		if (!temp) {
			line.errorLine = true;
			return false;
		} else {
			line.tag = temp;
			return true;
		}
	}
	//#endregion 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令

	//#region 第三次的通用分析，仅对编译命令行的表达式小节分析
	private static async ThirdAnalyse_Common(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		return !LexerUtils.CheckLabelsAndShowError(line.tag, option);
	}
	//#endregion 第三次的通用分析，仅对编译命令行的表达式小节分析

	/***** 各个命令 *****/

	//#region BASE命令
	private static Compile_Base(option: CommonOption): boolean {
		let line = <CommandLine>option.allLine[option.lineIndex];
		let temp = LexerUtils.GetExpressionValue(line.tag, "getValue", option);
		if (temp.success && temp.value < 0) {
			MyException.PushException(line.expression, ErrorType.ArgumentError, ErrorLevel.Show);
			return false;
		}

		line.isFinished = true;
		GlobalVar.env.baseAddress = temp.value;
		GlobalVar.env.addressOffset = GlobalVar.env.baseAddress - GlobalVar.env.originalAddress;
		return true;
	}
	//#endregion BASE命令

	//#region DEF命令
	private static FirstAnalyse_Def(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		let tokens: Token[] = option.tag;
		let label = LabelUtils.CreateLabel(tokens[0], undefined, line.comment);
		if (!label) {
			line.errorLine = true;
			return false;
		}

		label.labelDefined = LabelDefinedState.Defined;
		line.label = tokens[0];
		tokens[0].type = TokenType.Defined;
		line.tokens.push(tokens[0]);

		let temp = LexerUtils.SplitAndSort(tokens[1]);
		if (!temp) {
			line.errorLine = true;
			return false;
		}

		line.tag = temp;
		return true;
	}

	private static ThirdAnalyse_Def(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		if (LexerUtils.CheckLabelsAndShowError(line.tag, option)) {
			line.errorLine = true;
			return false;
		}
		// let partCopy:LexPart[] = Utils.DeepClone(line.tag);
		line.tokens.push(...LexerUtils.LexPartsToTokens(line.tag));

		let temp = LexerUtils.GetExpressionValue(line.tag, "tryValue", option);
		if (temp.success) {
			let label = LabelUtils.FindLabel(line.label!, option);
			label!.value = temp.value;
			return true;
		}
		return false;
	}

	private static Compile_Def(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];

		let temp = LexerUtils.GetExpressionValue(line.tag, "getValue");
		let label = LabelUtils.FindLabel(line.label!, option);
		if (label && temp.success) {
			label.value = temp.value;
			line.isFinished = true;
			return true;
		}
		return false;
	}
	//#endregion DEF命令

	//#region DB/DW/DL命令
	private static Compile_DataByte(option: CommonOption) {
		return Commands.Compile_Data(option, 1);
	}

	private static Compile_DataWord(option: CommonOption) {
		return Commands.Compile_Data(option, 2);
	}

	private static Compile_DataLong(option: CommonOption) {
		return Commands.Compile_Data(option, 4);
	}

	private static FirstAnalyse_Data(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		let result = Utils.SplitComma(line.expression);
		if (!result.success) {
			line.errorLine = true;
			return false;
		}

		line.tag = [];
		for (let i = 0; i < result.parts.length; i++) {
			let word = result.parts[i];
			let temp = LexerUtils.SplitAndSort(word);
			if (!temp) {
				line.errorLine = true;
				line.tag[i] = [];
			} else {
				line.tag[i] = temp;
			}
		}
		return !line.errorLine;
	}

	private static ThirdAnalyse_Data(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		let parts: LexPart[][] = line.tag;
		for (let i = 0; i < parts.length; i++) {
			let tempPart: LexPart[] = parts[i];
			let noError = LexerUtils.CheckLabelsAndShowError(tempPart, option);
			if (noError)
				line.errorLine = true;

			line.tokens.push(...LexerUtils.LexPartsToTokens(tempPart));
		}
		return !line.errorLine;
	}

	private static Compile_Data(option: CommonOption, dataLength: number) {
		let line = <CommandLine>option.allLine[option.lineIndex];

		if (!BaseLineUtils.AddressSet(line))
			return false;

		line.isFinished = true;
		let index = 0;

		// line.tag 是 LexPart[][]
		for (let i = 0; i < line.tag.length; i++) {
			const part: LexPart[] = line.tag[i];
			let temp = LexerUtils.GetExpressionValues(part, option);
			if (!temp.success) {
				line.isFinished = false;
				line.result.length += temp.values.length * dataLength;
				index += dataLength;
			} else {
				for (let j = 0; j < temp.values.length; j++) {
					let byteLength = Utils.DataByteLength(temp.values[j]);
					if (byteLength > dataLength) {
						MyException.PushException(part[j].token, ErrorType.ArgumentOutofRange, ErrorLevel.ShowAndBreak);
						return false;
					}

					BaseLineUtils.SetResult(line, temp.values[j], index, dataLength);
					index += dataLength;
				}
			}
		}

		BaseLineUtils.AddressAdd(line);
		return true;
	}
	//#endregion DB/DW/DL命令

	//#region DBG/DWG/DLG命令
	private static FirstAnalyse_DataGroup(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let lines = Commands.CollectBaseLines(option);
		let args: Token[] = option.tag;
		let label = LabelUtils.CreateLabel(args[0]);
		if (label!) {
			line.errorLine = true;
			return false;
		}

		line.label = args[0];
		line.tag = [];
		for (let i = 0; i < lines.length; i++) {
			const tempLine = lines[i];
			let temp = Utils.SplitComma(tempLine.orgText, true);
			if (!temp.success) {
				line.errorLine = true;
				break;
			}

			for (let j = 0; j < temp.parts.length; j++) {
				const p = temp.parts[j];
				let temp2 = LexerUtils.SplitAndSort(p);
				if (temp2)
					line.tag.push(temp2);
				else
					line.errorLine = true;

			}
		}
		return !line.errorLine;
	}

	private static ThirdAnalyse_DataGroup(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let args: LexPart[][] = line.tag;
		let dataGroup = new DataGroup();
		for (let i = 0; i < args.length; i++) {
			let temp = LexerUtils.CheckLabelsAndShowError(args[i]);
			if (temp) {
				line.errorLine = true;
			} else {
				args[i].forEach(v => {
					if (v.priority == PriorityState.Level_1_Label)
						dataGroup.PushData(v.token, i);
				});

				line.tokens.push(...LexerUtils.LexPartsToTokens(args[i]));
			}
		}
		let label = LabelUtils.CreateLabel(line.label);
		label!.tag = dataGroup;
		return !line.errorLine;
	}

	private static Compile_DataByteGroup(option: CommonOption) {
		return Commands.Compile_DataGroup(option, 1);
	}

	private static Compile_DataWordGroup(option: CommonOption) {
		return Commands.Compile_DataGroup(option, 2);
	}

	private static Compile_DataLongGroup(option: CommonOption) {
		return Commands.Compile_DataGroup(option, 4);
	}

	private static Compile_DataGroup(option: CommonOption, dataLength: number) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		BaseLineUtils.AddressSet(line);
		let label = LabelUtils.FindLabel(line.label!);
		if (label!.value == undefined)
			label!.value = GlobalVar.env.originalAddress;

		let args: LexPart[][] = line.tag;
		line.result.length = args.length * dataLength;
		line.isFinished = true;

		for (let i = 0; i < args.length; i++) {
			const lex = args[i];
			let temp = LexerUtils.GetExpressionValue(lex, "getValue");
			if (!temp.success) {
				break;
			} else {
				let byteLength = Utils.DataByteLength(temp.value);
				if (byteLength > dataLength) {
					let token = LexerUtils.CombineLexToToken(lex);
					MyException.PushException(token, ErrorType.ArgumentOutofRange, ErrorLevel.ShowAndBreak);
					line.errorLine = true;
					break;
				}
			}
		}

		BaseLineUtils.AddressAdd(line);
		return !line.errorLine;
	}
	//#endregion DBG/DWG/DLG命令

	//#region INCLUDE命令
	private static async FristAnalyse_Include(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		let check = await Commands.CheckFile(line.expression);
		if (line.label)
			line.tokens = [line.label];

		if (check.exsist) {
			if (check.path == GlobalVar.env.GetFile(line.keyword.fileHash)) {
				MyException.PushException(line.expression, ErrorType.ArgumentError, ErrorLevel.Show);
			} else if (GlobalVar.env.isCompile) {
				let hash = GlobalVar.env.SetFile(check.path);
				let data = await FileUtils.ReadFile(check.path);
				let text = FileUtils.BytesToString(data);
				let allLines = Compile.GetAllBaseLine(text, hash);

				option.allLine.splice(option.lineIndex + 1, 0, ...allLines);
				line.lineType = BaseLineType.OnlyLabel;
				if (!line.label || line.label.isNull)
					line.errorLine = true;
				else
					line.orgText = line.label;
			}
		} else {
			line.errorLine = !check.exsist;
		}
		return check.exsist;
	}
	//#endregion INCLUDE命令

	//#region INCBIN命令
	private static async FristAnalyse_IncBin(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		if (line.label)
			line.tokens = [line.label];

		let args: Token[] = option.tag;
		let check = await Commands.CheckFile(args[0]);
		if (!check.exsist) {
			line.errorLine = true;
			return false;
		}

		line.tag = [];
		line.tag[0] = check.path;
		let temp = LexerUtils.SplitAndSort(args[1]);
		if (temp) {
			line.tag[1] = temp;
		} else {
			line.errorLine = true;
			return false;
		}

		temp = LexerUtils.SplitAndSort(args[2]);
		if (temp) {
			line.tag[2] = temp;
		} else {
			line.errorLine = true;
			return false;
		}

		line.errorLine = !check.exsist;
		return true;
	}

	private static async Compile_IncBin(option: CommonOption) {
		let line = <CommandLine>option.allLine[option.lineIndex];
		let filePath: string = line.tag[0];

		let data = await FileUtils.ReadFile(filePath);

		BaseLineUtils.AddressSet(line);

		let start = 0;
		let length = data.length;
		if (line.tag[1].length != 0) {
			let ex = LexerUtils.GetExpressionValue(line.tag[1], "getValue", option);
			if (!ex.success) {
				return false;
			}
			start = ex.value;
			length = length - start;
		}

		if (line.tag[2].length != 0) {
			let ex = LexerUtils.GetExpressionValue(line.tag[2], "getValue", option);
			if (!ex.success)
				return false;

			length = ex.value;
		}

		for (let i = 0, j = start; i < length && j < data.length; i++, j++)
			line.result.push(data[j]);

		BaseLineUtils.AddressAdd(line);
		line.isFinished = true;
		return true;
	}
	//#endregion INCBIN命令

	//#region ORG命令
	private static Compile_Org(option: CommonOption): boolean {
		const line = <CommandLine>option.allLine[option.lineIndex];

		let temp = LexerUtils.GetExpressionValue(line.tag, "getValue");
		if (!temp.success || temp.value < 0) {
			MyException.PushException(line.tag, ErrorType.ArgumentError, ErrorLevel.Show);
			return false;
		}

		line.isFinished = true;
		let temp2 = GlobalVar.env.originalAddress;
		GlobalVar.env.originalAddress = temp.value;
		if (temp2 >= 0) {
			GlobalVar.env.baseAddress = GlobalVar.env.originalAddress + GlobalVar.env.addressOffset;
		} else {
			GlobalVar.env.addressOffset = GlobalVar.env.baseAddress - GlobalVar.env.originalAddress;
		}
		// GlobalVar.env.addressOffset = GlobalVar.env.baseAddress - GlobalVar.env.originalAddress;

		return true;
	}
	//#endregion ORG命令 

	//#region HEX命令
	private static FirstAnalyse_Hex(option: CommonOption): boolean {
		const line = <CommandLine>option.allLine[option.lineIndex];

		if (!/^[0-9a-fA-F\s]+$/g.test(line.expression.text)) {
			MyException.PushException(line.expression, ErrorType.ArgumentError, ErrorLevel.Show);
			return false;
		}
		return true;
	}

	private static Compile_Hex(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];

		let parts = line.expression.Split(/\s+/g);
		let result: number[] = [];
		BaseLineUtils.AddressSet(line);
		for (let index = 0; index < parts.length; index++) {
			const part = parts[index];
			for (let i = 0; i < part.length; i += 2) {
				if (i + 1 >= part.length)
					result.push(parseInt(part.text.substring(i), 16));
				else
					result.push(parseInt(part.text.substring(i, i + 2), 16));
			}
		}
		line.isFinished = true;
		line.result = result;
		BaseLineUtils.AddressAdd(line);
		return true;
	}
	//#endregion HEX命令

	//#region IF/ELSEIF/ELSE命令
	/**
	 * 将所有判断行备份保存
	 * @param option 编译选项
	 * @returns 
	 */
	private static FirstAnalyse_If(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];

		let result = option.includeCommandLines!;
		let index = 0;
		let commands = [".ELSEIF", ".ELSE", ".ENDIF"];

		let tag: ConfidentLine[] = [{ index: result[0].index, confident: false }];
		for (let i = 1; i < result.length; i++) {
			let temp = commands.indexOf(result[i].match);
			if (temp < index)
				continue;

			if (temp == 1)
				index++;

			tag.push({ index: result[i].index, confident: false });
		}

		line.tag = [tag];
		return true;
	}

	private static ThirdAnalyse_If(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let tag: ConfidentLine[] = line.tag;
		for (let i = 0; i < tag.length - 1; i++) {
			const tempLine = <CommandLine>option.allLine[tag[i].index];
			if (tempLine.keyword.text != ".ELSE") {
				if (tempLine.expression.isNull)
					MyException.PushException(tempLine.keyword, ErrorType.CommandParamsError, ErrorLevel.Show);

				continue;
			}

			let temp = LexerUtils.SplitAndSort(tempLine.expression);
			if (!temp) continue;

			if (i == 0)
				tempLine.tag[1] = temp;
			else
				tempLine.tag = temp;

			tempLine.tokens = LexerUtils.LexPartsToTokens(temp);
			LexerUtils.CheckLabelsAndShowError(temp, option);
		}
		return true;
	}

	private static async Compile_If(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];

		let tag: ConfidentLine[] = line.tag[0];

		for (let i = 0; i < tag.length - 1; i++) {
			const tempLine = <CommandLine>option.allLine[tag[i].index];
			if (tempLine.keyword.text == ".ELSE") {
				tag[i].confident = true;
				break;
			}

			let expParts = i == 0 ? tempLine.tag[1] : tempLine.tag;
			let value = LexerUtils.GetExpressionValue(expParts, "getValue", option);
			if (value.success && value.value) {
				tag[i].confident = true;
				break;
			}
		}

		Commands.RemoveBaseLines(option, tag);
		return true;
	}
	//#endregion IF/ELSEIF/ELSE命令

	//#region IFDEF命令
	private static FirstAnalyse_IfDef(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];

		let result = option.includeCommandLines!;
		let index = 0;
		let commands = [".ELSE", ".ENDIF"];

		let tag: ConfidentLine[] = [{ index: result[0].index, confident: false }];
		for (let i = 1; i < result.length; i++) {
			let temp = commands.indexOf(result[i].match);
			if (temp < index)
				continue;

			if (temp == 0)
				index++;

			tag.push({ index: result[i].index, confident: false });
		}

		line.tag = tag;
		return true;
	}

	private static Compile_IfDef(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let tag: ConfidentLine[] = line.tag;

		for (let i = 0; i < tag.length - 1; i++) {
			const tempLine = option.allLine[tag[i].index];
			if (line.keyword.text == ".ELSE") {
				tag[i].confident = true;
				break;
			}
			let lebal = LabelUtils.FindLabel(line.expression, option);
			if (lebal) {
				tag[i].confident = true;
				break;
			}
		}

		Commands.RemoveBaseLines(option, tag);
		return true;
	}
	//#endregion IFDEF命令

	//#region IFNDEF命令
	private static FirstAnalyse_IfNDef(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];

		let result = option.includeCommandLines!;
		let index = 0;
		let commands = [".ELSE", ".ENDIF"];

		let tag: ConfidentLine[] = [{ index: result[0].index, confident: false }];
		for (let i = 1; i < result.length; i++) {
			let temp = commands.indexOf(result[i].match);
			if (temp < index)
				continue;

			if (temp == 0)
				index++;

			tag.push({ index: result[i].index, confident: false });
		}

		line.tag = tag;
		return true;
	}

	private static Compile_IfNDef(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let tag: ConfidentLine[] = line.tag;

		for (let i = 0; i < tag.length - 1; i++) {
			const tempLine = <CommandLine>option.allLine[tag[i].index];
			if (tempLine.keyword.text == ".ELSE") {
				tag[i].confident = true;
				break;
			}
			let lebal = LabelUtils.FindLabel(tempLine.expression, option);
			if (!lebal) {
				tag[i].confident = true;
				break;
			}
		}

		Commands.RemoveBaseLines(option, tag);
		return true;
	}
	//#endregion IFNDEF命令

	//#region MACRO命令
	private static async FirstAnalyse_Macro(option: CommonOption): Promise<boolean> {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let args: Token[] = option.tag;
		let macro = MacroUtils.CreateMacro(args[0], args[1]);
		if (!macro) {
			line.errorLine = true;
			return false;
		}

		args[0].type = TokenType.Macro;
		line.tokens = [args[0]];

		macro.comment = line.comment;
		macro.lines = Commands.CollectBaseLines(option);
		line.tag = macro;
		let tempOption: CommonOption = {
			allLine: macro.lines,
			lineIndex: 0,
			macro: macro
		};
		await Compile.FirstAnalyse(tempOption);
		return true;
	}

	private static async SecondAnalyse_Macro(option: CommonOption): Promise<boolean> {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let macro: Macro = line.tag;
		let tempOption: CommonOption = {
			allLine: macro.lines,
			lineIndex: 0,
			macro: macro
		};
		await Compile.SecondAnalyse(tempOption);
		return true;
	}

	private static async ThirdAnalyse_Macro(option: CommonOption): Promise<boolean> {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let macro: Macro = line.tag;
		let tempOption: CommonOption = {
			allLine: macro.lines,
			lineIndex: 0,
			macro: macro
		};
		await Compile.ThirdAnalyse(tempOption);
		for (let i = 0; i < macro.lines.length; i++) {
			line.tokens.push(...macro.lines[i].GetToken());
		}
		return true;
	}
	//#endregion MACRO命令

	//#region REPEAT命令
	private static FirstAnalyse_Repeat(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let length = option.includeCommandLines![1].index - option.includeCommandLines![0].index;
		let expParts = LexerUtils.SplitAndSort(line.expression);
		if (!expParts) {
			line.errorLine = true;
			return false;
		}
		line.tag = [length, expParts];
		return true;
	}

	private static ThirdAnalyse_Repeat(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let expParts: LexPart[] = line.tag[1];
		line.tokens.push(...LexerUtils.LexPartsToTokens(expParts));
		return !LexerUtils.CheckLabelsAndShowError(expParts);
	}

	private static Compile_Repeat(option: CommonOption) {
		const line = <CommandLine>option.allLine[option.lineIndex];
		let length: number = line.tag[0];
		let expParts: LexPart[] = line.tag[1];
		let result = LexerUtils.GetExpressionValue(expParts, "getValue");
		if (!result.success || result.value < 0)
			return false;

		option.allLine.splice(option.lineIndex, 1);
		let tempLines = option.allLine.splice(option.lineIndex, length);
		tempLines.splice(tempLines.length - 1, 1);
		while (result.value != 0) {
			let tempArray = tempLines.map(value => Utils.DeepClone(value));
			option.allLine.splice(option.lineIndex, 0, ...tempArray);
			result.value--;
		}
		option.lineIndex--;
		return true;
	}
	//#endregion REPEAT命令

	/***** 辅助 *****/

	//#region 获取命令的正则表达式
	/**获取命令的正则表达式 */
	private static GetCommandRegexStr() {
		Commands.commandsRegexStr = "(^|\\s+)(";
		for (let key in Commands.commandsParamsCount) {
			key = Utils.ReplaceRegStr(key);
			Commands.commandsRegexStr += `${key}|`;
		}
		Commands.commandsRegexStr = Commands.commandsRegexStr.substring(0, Commands.commandsRegexStr.length - 1);
		Commands.commandsRegexStr += ")(\\s+|$)";
	}
	//#endregion 获取命令的正则表达式

	//#region 添加所有命令
	private static AddAllCommands() {
		Commands.AddCommand({
			name: ".BASE", min: 1, ableMacro: false,
			firstAnalyse: Commands.FirstAnalyse_Common, thirdAnalyse: Commands.ThirdAnalyse_Common, compile: Commands.Compile_Base
		});
		Commands.AddCommand({
			name: ".DEF", min: 2, ableMacro: false, label: false,
			firstAnalyse: Commands.FirstAnalyse_Def, thirdAnalyse: Commands.ThirdAnalyse_Def, compile: Commands.Compile_Def
		});
		Commands.AddCommand({
			name: ".DB", min: 1,
			firstAnalyse: Commands.FirstAnalyse_Data, thirdAnalyse: Commands.ThirdAnalyse_Data, compile: Commands.Compile_DataByte
		});
		Commands.AddCommand({
			name: ".DW", min: 1,
			firstAnalyse: Commands.FirstAnalyse_Data, thirdAnalyse: Commands.ThirdAnalyse_Data, compile: Commands.Compile_DataWord
		});
		Commands.AddCommand({
			name: ".DL", min: 1,
			firstAnalyse: Commands.FirstAnalyse_Data, thirdAnalyse: Commands.ThirdAnalyse_Data, compile: Commands.Compile_DataLong
		});
		Commands.AddCommand({
			name: ".DBG", end: ".ENDD", min: 1, ableMacro: false,
			firstAnalyse: Commands.FirstAnalyse_DataGroup, thirdAnalyse: Commands.ThirdAnalyse_DataGroup, compile: Commands.Compile_DataByteGroup,
		});
		Commands.AddCommand({
			name: ".DWG", end: ".ENDD", min: 1, ableMacro: false,
			firstAnalyse: Commands.FirstAnalyse_DataGroup, thirdAnalyse: Commands.ThirdAnalyse_DataGroup, compile: Commands.Compile_DataWordGroup
		});
		Commands.AddCommand({
			name: ".DLG", end: ".ENDD", min: 1, ableMacro: false,
			firstAnalyse: Commands.FirstAnalyse_DataGroup, thirdAnalyse: Commands.ThirdAnalyse_DataGroup, compile: Commands.Compile_DataLongGroup
		});
		Commands.AddCommand({
			name: ".HEX", min: 1,
			firstAnalyse: Commands.FirstAnalyse_Hex, compile: Commands.Compile_Hex
		});
		Commands.AddCommand({
			name: ".IF", min: 1, end: ".ENDIF", label: false, nested: true,
			includes: [{ name: ".ELSEIF", min: 1 }, { name: ".ELSE", min: 0 }],
			firstAnalyse: Commands.FirstAnalyse_If, thirdAnalyse: Commands.ThirdAnalyse_If, compile: Commands.Compile_If
		});
		Commands.AddCommand({
			name: ".IFDEF", min: 1, end: ".ENDIF", label: false, nested: true, ableMacro: true,
			includes: [{ name: ".ELSE", min: 0 }],
			firstAnalyse: Commands.FirstAnalyse_IfDef, compile: Commands.Compile_IfDef
		});
		Commands.AddCommand({
			name: ".IFNDEF", min: 1, end: ".ENDIF", label: false, nested: true, ableMacro: true,
			includes: [{ name: ".ELSE", min: 0 }],
			firstAnalyse: Commands.FirstAnalyse_IfNDef, compile: Commands.Compile_IfNDef
		});
		Commands.AddCommand({
			name: ".INCLUDE", min: 1, ableMacro: false,
			firstAnalyse: Commands.FristAnalyse_Include
		});
		Commands.AddCommand({
			name: ".INCBIN", min: 1, max: 3, ableMacro: false,
			firstAnalyse: Commands.FristAnalyse_IncBin, compile: Commands.Compile_IncBin
		});
		Commands.AddCommand({
			name: ".MACRO", end: ".ENDM", min: 1, max: 2, label: false,
			firstAnalyse: Commands.FirstAnalyse_Macro, secondAnalyse: Commands.SecondAnalyse_Macro, thirdAnalyse: Commands.ThirdAnalyse_Macro,
		});
		Commands.AddCommand({
			name: ".ORG", min: 1, ableMacro: false,
			firstAnalyse: Commands.FirstAnalyse_Common, thirdAnalyse: Commands.ThirdAnalyse_Common, compile: Commands.Compile_Org
		});
		Commands.AddCommand({
			name: ".REPEAT", min: 1, end: ".ENDR", label: false,
			firstAnalyse: Commands.FirstAnalyse_Repeat, thirdAnalyse: Commands.ThirdAnalyse_Repeat, compile: Commands.Compile_Repeat
		});
	}
	//#endregion 添加所有命令

	//#region 增加命令
	/**增加命令 */
	private static AddCommand(
		option: {
			name: string,
			includes?: IncludeCommand[],
			end?: string,
			ignoreEnd?: boolean,
			/**允许有标签，默认允许 */
			label?: boolean,
			min: number,
			max?: number,
			nested?: boolean,
			/**允许使用在Macro内，默认允许 */
			ableMacro?: boolean
			/**基础分析 */
			firstAnalyse?: (option: CommonOption) => Promise<boolean> | boolean,
			secondAnalyse?: (option: CommonOption) => Promise<boolean> | boolean,
			thirdAnalyse?: (baseLine: CommonOption) => Promise<boolean> | boolean,
			compile?: (option: CommonOption) => Promise<boolean> | boolean,
		}
	) {
		let actionParams: CommandParams = {
			FirstAnalyse: option.firstAnalyse,
			SecondAnalyse: option.secondAnalyse,
			ThirdAnalyse: option.thirdAnalyse,
			CommandCompile: option.compile,
			startCommand: option.name,
			includeCommand: option.includes,
			endCommand: option.end,
			enableLabel: option.label ?? true,
			nested: option.nested ?? false,
			enableInMacro: option.ableMacro ?? true
		};

		Commands.commandsParamsCount[option.name] = { min: option.min, max: option.max ?? option.min };
		if (option.end) {
			Commands.commandsParamsCount[option.end] = { min: 0, max: 0 };
			if (option.ignoreEnd && !Commands.ignoreEndCom.includes(option.end))
				Commands.ignoreEndCom.push(option.end);
		}

		if (option.includes) {
			option.includes.forEach(value => {
				Commands.commandsParamsCount[value.name] = { min: value.min, max: value.max ?? value.min };
			});
		}

		Commands.allCommands[option.name] = actionParams;
	}
	//#endregion 增加命令

	//#region 分析参数是否满足，并做最大分割
	/**
	 * 分析参数是否满足，并做最大分割
	 * @param line 一行命令
	 * @returns 是否满足
	 */
	private static AnalyseParams(line: CommandLine) {
		let params = Commands.commandsParamsCount[line.keyword.text];
		if (params.max == 0) {
			if (!line.expression.isNull) {
				line.errorLine = true;
				MyException.PushException(line.keyword, ErrorType.ArgumentCountError, ErrorLevel.Show);
				return;
			}
			return [line.expression.Copy()];
		}

		let args = line.expression.Split(/\s+/g, params.max - 1);
		if (args[params.min - 1].isNull) {
			line.errorLine = true;
			MyException.PushException(line.keyword, ErrorType.ArgumentCountError, ErrorLevel.Show);
			return;
		}
		return args;
	}
	//#endregion 分析参数是否满足，并做最大分割

	//#region 查找下一个命令
	/**
	 * 查找下一个命令
	 * @param endCommand 结束命令
	 * @param option 编译选项
	 * @param includes 包含的命令
	 * @returns 找到每一个匹配的行
	 */
	private static FindNextMatchCommand(startCommand: string, endCommand: string, nested: boolean, option: CommonOption, includes?: IncludeCommand[]) {
		let result: MatchLine[] = [];
		let names = includes?.map(value => value.name);
		let deep = 0;
		let found = false;
		for (let i = option.lineIndex + 1; i < option.allLine.length; i++) {
			let line = <CommandLine>option.allLine[i];
			if (line.lineType != BaseLineType.Command)
				continue;

			if (line.keyword.text == startCommand) {
				if (!nested) {
					MyException.PushException(line.keyword, ErrorType.CommandNotSupportNested, ErrorLevel.Show);
					continue;
				}

				deep++;
				// result.push({ match: line.keyword.text, index: i });
				continue;
			}

			if (line.keyword.text == endCommand) {
				if (deep > 0) {
					deep--;
					continue;
				}
				result.push({ match: line.keyword.text, index: i });
				found = true;
				break;
			}

			if (deep != 0 || !names?.includes(line.keyword.text))
				continue;

			result.push({ match: line.keyword.text, index: i });
		}
		if (found)
			result.unshift({ match: startCommand, index: option.lineIndex });
		else
			result = [];

		return result;
	}
	//#endregion 查找下一个命令

	//#region 检查文件是否存在
	private static async CheckFile(expression: Token) {
		let result = { exsist: true, path: "" };
		if (!expression.text.startsWith("\"") || !expression.text.endsWith("\"")) {
			MyException.PushException(expression, ErrorType.ExpressionError, ErrorLevel.Show);
			result.exsist = false;
			return result;
		}

		/**被检测文件 */
		let path1 = expression.Substring(1, expression.length - 2);
		if (await FileUtils.PathType(path1.text) == "file") {
			result.exsist = true;
			result.path = path1.text;
			return result;
		}

		/**当前文件 */
		let file = GlobalVar.env.GetFile(expression.fileHash);

		let folder = await FileUtils.GetPathFolder(file);

		let path2 = FileUtils.Combine(folder, path1.text);

		result.exsist = (await FileUtils.PathType(path2)) == "file";
		if (!result.exsist) {
			MyException.PushException(expression, ErrorType.FileIsNotExsist, ErrorLevel.Show);
		}
		result.path = path2;
		return result;
	}
	//#endregion 检查文件是否存在

	//#region 移除对应行
	private static RemoveBaseLines(option: CommonOption, indexs: ConfidentLine[]) {
		option.allLine.splice(indexs[indexs.length - 1].index, 1);
		for (let i = indexs.length - 2; i >= 0; i--) {
			if (!indexs[i].confident)
				option.allLine.splice(indexs[i].index, indexs[i + 1].index - indexs[i].index);
			else
				option.allLine.splice(indexs[i].index, 1);
		}
		option.lineIndex--;
	}
	//#endregion 移除对应行

	//#region 将头尾行的所有行纳入
	private static CollectBaseLines(option: CommonOption) {
		let start = option.includeCommandLines![0].index;
		let end = option.includeCommandLines![1].index;
		let tag = option.allLine.splice(start + 1, end - start);
		tag.splice(tag.length - 1, 1);
		return tag;
	}
	//#endregion 将头尾行的所有行纳入

}