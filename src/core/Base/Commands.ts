import { BaseLine, BaseLineFinishType, BaseLineType } from "./BaseLine";
import { CompileOption } from "./CompileOption";
import { OneWord } from "./OneWord";
import { GlobalVar } from "./GlobalVar";
import { ErrorLevel, ErrorType, MyException } from "./MyException";
import { LexerUtils } from "../Utils/LexerUtils";
import { LebalUtils } from "../Utils/LebalUtils";
import { Utils } from "../Utils/Utils";
import { Macro } from "./Macro";
import { Compile } from "./Compile";
import { FileUtils } from "../Utils/FileUtils";
import { DataGroup, DataGroupPart } from "./DataGroup";
import { MacroUtils } from "../Utils/MacroUtils";

export class Commands {

	static commandsParamsCount: Record<string, { min: number, max: number }> = {};
	static allCommands: Record<string, CommandParams> = {};
	static get commandsRegex() { return new RegExp(Commands.commandsRegexStr, "ig"); }

	private static commandsRegexStr: string = "";
	private static ignoreEndCom: string[] = [];

	//#region 初始化
	/**初始化 */
	static Initialize() {
		Commands.GetAllCommands();
		Commands.GetCommandRegexStr();
	}
	//#endregion 初始化

	//#region 获取命令的正则表达式
	/**获取命令的正则表达式 */
	static GetCommandRegexStr() {
		Commands.commandsRegexStr = "(^|\\s+)(";
		for (let key in Commands.commandsParamsCount) {
			Commands.commandsRegexStr += `\\${key}|`;
		}
		Commands.commandsRegexStr = Commands.commandsRegexStr.substring(0, Commands.commandsRegexStr.length - 1);
		Commands.commandsRegexStr += ")(\\s+|$)";
	}
	//#endregion 获取命令的正则表达式

	/***** 基础分析 *****/

	//#region 第一阶段，编译器命令基础分析
	/**
	 * 第一阶段，编译器命令基础分析
	 * @param option 编译选项
	 * @returns 是否编译成功
	 */
	static async BaseAnalyse(option: CompileOption) {
		let line = option.allBaseLine[option.baseLineIndex];
		let command = line.keyword;
		if (Commands.ignoreEndCom.includes(command.text))
			return true;

		let com = Commands.allCommands[command.text];
		if (option.macro && !com.enableInMacro) {
			line.finishType = BaseLineFinishType.ErrorAndBreak;
			MyException.PushException(command, ErrorType.CommandNotInMacro, ErrorLevel.ShowAndBreak);
			return false;
		}

		// 寻找匹配结尾
		if (com.endCommand) {
			let success = Commands.FindNextMatchCommand(com.startCommand, com.endCommand, com.nested, option, com.includeCommand);
			if (success.length == 0) {
				line.finishType = BaseLineFinishType.ErrorAndBreak;
				MyException.PushException(command, ErrorType.CommandNotClosed, ErrorLevel.ShowAndBreak);
				return false;
			}
			option.includeCommandLines = success;
			for (let i = 1; i < option.includeCommandLines!.length; i++) {
				Commands.AnalyseParams(option.allBaseLine[option.includeCommandLines![i].index])
			}
		}

		let args = Commands.AnalyseParams(line);
		if (!args)
			return false;

		// 命令不允许有标签
		if (!com.enableLebal && line.lebalWord) {
			line.finishType = BaseLineFinishType.ErrorLine;
			MyException.PushException(line.lebalWord, ErrorType.CommandNotSupportLebal, ErrorLevel.Show);
			line.lebalWord = undefined;
			line.finishType = BaseLineFinishType.ErrorLine;
			return false;
		}

		let temp = Commands.allCommands[command.text].BaseAnalyse;
		if (temp) {
			option.exps = args;
			return await temp(option);
		}

		return true;
	}
	//#endregion 第一阶段，编译器命令基础分析

	//#region 第二阶段，编译器分割位置标签
	static async AnalyseMacro(option: CompileOption) {
		if (Commands.ignoreEndCom.includes(option.currectLine.keyword.text))
			return true;

		let com = Commands.allCommands[option.currectLine.keyword.text];
		if (com.AnalyseMacro)
			await com.AnalyseMacro(option);
	}
	//#endregion 第二阶段，编译器分割位置标签

	//#region 第三部分，编译器分析标签部分
	static async AnalyseLebal(option: CompileOption) {
		if (Commands.ignoreEndCom.includes(option.currectLine.keyword.text))
			return true;

		let com = Commands.allCommands[option.currectLine.keyword.text];
		if (com.AnalyseLebal) {
			await com.AnalyseLebal(option);
		}
	}
	//#endregion 第三部分，编译器分析标签部分

	/***** 编译分析 *****/

	//#region 分析命令
	/**分析命令 */
	static async AnalyseCommand(option: CompileOption): Promise<boolean> {
		let params = Commands.commandsParamsCount[option.currectLine.keyword!.text];
		option.exps = option.currectLine.expression.Split(/\s+/g, params.max - 1);
		let temp = Commands.allCommands[option.currectLine.keyword!.text].CommandCompile;
		if (temp)
			return await temp(option);

		return false;
	}
	//#endregion 分析命令

	/***** 基础命令 *****/

	//#region 获取命令信息
	/**获取命令信息 */
	private static GetAllCommands() {
		Commands.AddCommand({
			name: ".DB", min: 1,
			analyseLebal: Commands.AnalyseLebal_Data, action: Commands.Command_DataByte
		});
		Commands.AddCommand({
			name: ".DW", min: 1,
			analyseLebal: Commands.AnalyseLebal_Data, action: Commands.Command_DataWord
		});
		Commands.AddCommand({
			name: ".DL", min: 1,
			analyseLebal: Commands.AnalyseLebal_Data, action: Commands.Command_DataLong
		});
		Commands.AddCommand({
			name: ".DBG", end: ".ENDD", min: 1, ableMacro: false,
			baseAnalyse: Commands.PreAnalyse_DataGroup, analyseLebal: Commands.AnalyseLebal_DataGroup, action: Commands.Command_DataGroupByte,
		});
		Commands.AddCommand({
			name: ".DWG", end: ".ENDD", min: 1, ableMacro: false,
			baseAnalyse: Commands.PreAnalyse_DataGroup, analyseLebal: Commands.AnalyseLebal_DataGroup, action: Commands.Command_DataGroupWord
		});
		Commands.AddCommand({
			name: ".DLG", end: ".ENDD", min: 1, ableMacro: false,
			baseAnalyse: Commands.PreAnalyse_DataGroup, analyseLebal: Commands.AnalyseLebal_DataGroup, action: Commands.Command_DataGroupLong
		});
		Commands.AddCommand({
			name: ".ORG", min: 1, ableMacro: false,
			analyseLebal: Commands.AnalyseLebals, action: Commands.Command_Org
		});
		Commands.AddCommand({
			name: ".BASE", min: 1, ableMacro: false,
			analyseLebal: Commands.AnalyseLebals, action: Commands.Command_Base
		});
		Commands.AddCommand({
			name: ".INCLUDE", min: 1, ableMacro: false,
			baseAnalyse: Commands.PreAnalyse_Include
		});
		Commands.AddCommand({
			name: ".INCBIN", min: 1, max: 3, ableMacro: false,
			baseAnalyse: Commands.PreAnalyse_IncBin, action: Commands.Command_IncBin
		});
		Commands.AddCommand({
			name: ".DEF", min: 2, ableMacro: false, lebal: false,
			baseAnalyse: Commands.PreAnalyse_Def, analyseLebal: Commands.AnalyseLebal_Def, action: Commands.Command_Def
		});
		Commands.AddCommand({
			name: ".HEX", min: 1,
			baseAnalyse: Commands.PreAnalyse_Hex, action: Commands.Command_Hex
		});
		Commands.AddCommand({
			name: ".MACRO", end: ".ENDM", min: 1, max: 2, ableMacro: false, lebal: false,
			baseAnalyse: Commands.PreAnalyse_Macro, analyseMacro: Commands.AnalyseMacro_Macro, analyseLebal: Commands.AnalyseLebal_Macro
		});
		Commands.AddCommand({
			name: ".IF", min: 1, end: ".ENDIF", lebal: false, nested: true, ableMacro: true,
			includes: [{ name: ".ELSEIF", min: 1 }, { name: ".ELSE", min: 0 }],
			baseAnalyse: Commands.PreAnalyse_IF, analyseLebal: Commands.AnalyseLebal_IF, action: Commands.Command_IF
		});
		Commands.AddCommand({
			name: ".IFDEF", min: 1, end: ".ENDIF", lebal: false, nested: true, ableMacro: true,
			includes: [{ name: ".ELSE", min: 0 }],
			baseAnalyse: Commands.PreAnalyse_IFDEF, action: Commands.Command_IFDEF
		});
		Commands.AddCommand({
			name: ".IFNDEF", min: 1, end: ".ENDIF", lebal: false, nested: true, ableMacro: true,
			includes: [{ name: ".ELSE", min: 0 }],
			baseAnalyse: Commands.PreAnalyse_IFNDEF, action: Commands.Command_IFNDEF
		});
		Commands.AddCommand({
			name: ".REPEAT", min: 1, end: ".ENDR", ignoreEnd: true, lebal: false, nested: true, ableMacro: true,
			baseAnalyse: Commands.PreAnalyse_REPEAT, analyseLebal: Commands.AnalyseLebals, action: Commands.Command_REPEAT
		});
	}
	//#endregion 获取命令信息

	//#region 增加命令
	/**增加命令 */
	private static AddCommand(
		option: {
			name: string,
			includes?: IncludeCommand[],
			end?: string,
			ignoreEnd?: boolean,
			/**允许有标签，默认允许 */
			lebal?: boolean,
			min: number,
			max?: number,
			nested?: boolean,
			ableMacro?: boolean
			/**基础分析 */
			baseAnalyse?: (option: CompileOption) => Promise<boolean> | boolean,
			analyseMacro?: (option: CompileOption) => Promise<boolean> | boolean,
			analyseLebal?: (baseLine: CompileOption) => Promise<boolean> | boolean,
			action?: (option: CompileOption) => Promise<boolean> | boolean,
		}
	) {
		let actionParams: CommandParams = {
			BaseAnalyse: option.baseAnalyse,
			AnalyseMacro: option.analyseMacro,
			AnalyseLebal: option.analyseLebal,
			CommandCompile: option.action,
			startCommand: option.name,
			includeCommand: option.includes,
			endCommand: option.end,
			enableLebal: option.lebal ?? true,
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

	//#region 分析参数是否满足
	/**
	 * 分析参数是否满足
	 * @param line 一行命令
	 * @param paramsMax 参数最大值
	 * @param paramsMin 参数最小值
	 * @returns 是否满足
	 */
	private static AnalyseParams(line: BaseLine) {
		let params = Commands.commandsParamsCount[line.keyword.text];
		if (params.max == 0) {
			if (!line.expression.isNull) {
				MyException.PushException(line.keyword, ErrorType.ArgumentCountError, ErrorLevel.Show);
				return;
			}
			return [line.expression.Copy()];
		}

		let args = line.expression.Split(/\s+/g, params.max - 1);
		if (args[params.min - 1].isNull) {
			line.finishType = BaseLineFinishType.ErrorLine;
			MyException.PushException(line.keyword, ErrorType.ArgumentCountError, ErrorLevel.Show);
			return;
		}
		return args;
	}
	//#endregion 分析参数是否满足

	/***** 所有命令 *****/

	//#region DBG/DWG/DLG命令
	private static PreAnalyse_DataGroup(option: CompileOption) {
		let lines = Commands.CollectBaseLines(option);
		let lebal = LebalUtils.CreateLebal(option.exps![0]);
		if (!lebal)
			return false;

		option.currectLine.tag = lebal.word;
		let dataGroup = new DataGroup();
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			let temp = Utils.SplitComma(line.originalString, i != lines.length - 1);
			if (!temp.success)
				return false;

			temp.parts.forEach(t => dataGroup.PushData(t));
		}
		lebal.tag = dataGroup;
		return true;
	}

	private static AnalyseLebal_DataGroup(option: CompileOption) {
		let lebal = LebalUtils.FindLebal(option.currectLine.tag);
		if (!lebal)
			return false;

		let tag: DataGroup = lebal.tag;
		for (let i = 0; i < tag.allLebal.length; i++) {
			const word = tag.allLebal[i];
			LexerUtils.GetExpressionValues(word.word, "check", option);
		}

		return true;
	}

	private static Command_DataGroupByte(option: CompileOption) {
		return Commands.Command_DataGroup(option, 1);
	}

	private static Command_DataGroupWord(option: CompileOption) {
		return Commands.Command_DataGroup(option, 2);
	}

	private static Command_DataGroupLong(option: CompileOption) {
		return Commands.Command_DataGroup(option, 4);
	}

	private static Command_DataGroup(option: CompileOption, dataLength: number) {
		option.currectLine.SetAddress();
		let lebal = LebalUtils.FindLebal(option.currectLine.tag);
		if (lebal!.value == undefined)
			lebal!.value = GlobalVar.env.originalAddress;

		let exps: DataGroupPart[] = lebal!.tag.allLebal;
		option.currectLine.result.length = exps.length * dataLength;

		option.currectLine.finishType = BaseLineFinishType.Finished;
		for (let i = 0; i < exps.length; i++) {
			const part = exps[i];
			let temp = LexerUtils.GetExpressionValue(part.word, "getValue", option);
			if (!temp.success) {
				option.currectLine.finishType = BaseLineFinishType.NotFinished;
				break;
			} else {
				let byteLength = Utils.DataByteLength(temp.value);
				if (byteLength > dataLength) {
					MyException.PushException(part.word, ErrorType.ArgumentOutofRange, ErrorLevel.ShowAndBreak);
					return false;
				}
				option.currectLine.SetResultValue(temp.value, i * dataLength, dataLength);
			}
		}

		option.currectLine.AddressAdd();
		return true;
	}
	//#endregion DBG/DWG/DLG命令

	//#region DB/DW/DL命令
	private static Command_DataByte(option: CompileOption) {
		return Commands.Command_Data(option, 1);
	}

	private static Command_DataWord(option: CompileOption) {
		return Commands.Command_Data(option, 2);
	}

	private static Command_DataLong(option: CompileOption) {
		return Commands.Command_Data(option, 4);
	}

	private static AnalyseLebal_Data(option: CompileOption) {
		let line = option.allBaseLine[option.baseLineIndex];
		let result = Utils.SplitComma(line.expression);
		if (!result.success)
			return false;

		line.tag = result.parts;
		let noError = true;
		for (let i = 0; i < result.parts.length; i++) {
			let word = result.parts[i];

			let temp = LexerUtils.GetExpressionValues(word, "check", option);
			if (!temp.success)
				noError = false;
		}
		return noError;
	}

	private static Command_Data(option: CompileOption, dataLength: number) {
		let words: OneWord[] = option.currectLine.tag;
		option.currectLine.SetAddress();
		option.currectLine.finishType = BaseLineFinishType.Finished;

		let index = 0;
		for (let i = 0; i < words.length; i++) {
			const part = words[i];
			let temp = LexerUtils.GetExpressionValues(part, "getValue", option);
			if (!temp.success) {
				option.currectLine.finishType = BaseLineFinishType.NotFinished;
				option.currectLine.result.length += temp.values.length * dataLength;
				index += dataLength;
			} else {
				for (let j = 0; j < temp.values.length; j++) {
					let byteLength = Utils.DataByteLength(temp.values[j]);
					if (byteLength > dataLength) {
						MyException.PushException(part, ErrorType.ArgumentOutofRange, ErrorLevel.ShowAndBreak);
						return false;
					}

					option.currectLine.SetResultValue(temp.values[j], index, dataLength);
					index += dataLength;
				}
			}
		}

		option.currectLine.AddressAdd();
		return true;
	}
	//#endregion DB/DW/DL命令

	//#region DEF命令
	private static PreAnalyse_Def(option: CompileOption) {
		const { comment } = BaseLine.GetComment(option.currectLine.originalString);
		let lebal = LebalUtils.CreateLebal(option.exps![0], undefined, comment);
		return !!lebal;
	}

	private static AnalyseLebal_Def(option: CompileOption) {
		const line = option.currectLine;
		let exps = line.expression.Split(/\s+/g, 1);
		let temp = LexerUtils.GetExpressionValue(exps[1], "tryValue");
		if (temp.success) {
			let lebal = LebalUtils.FindLebal(exps[0]);
			lebal!.value = temp.value;
			return true;
		}
		return false;
	}

	private static Command_Def(option: CompileOption) {
		let temp = LexerUtils.GetExpressionValue(option.exps![1], "getValue");
		let lebal = LebalUtils.FindLebal(option.exps![0], option);
		if (lebal && temp.success) {
			lebal.value = temp.value;
			option.currectLine.finishType = BaseLineFinishType.Finished;
			return true;
		}
		return false;
	}
	//#endregion DEF命令

	//#region HEX命令
	private static PreAnalyse_Hex(option: CompileOption): boolean {
		if (!/^[0-9a-fA-F\s]+$/g.test(option.exps![0].text)) {
			MyException.PushException(option.exps![0], ErrorType.ArgumentError, ErrorLevel.Show);
			return false;
		}
		return true;
	}

	private static Command_Hex(option: CompileOption) {
		let parts = option.exps![0].Split(/\s+/g);
		let result: number[] = [];
		option.currectLine.SetAddress();
		for (let index = 0; index < parts.length; index++) {
			const part = parts[index];
			for (let i = 0; i < part.length; i += 2) {
				if (i + 1 >= part.length)
					result.push(parseInt(part.text.substring(i), 16));
				else
					result.push(parseInt(part.text.substring(i, i + 2), 16));
			}
		}
		option.currectLine.finishType = BaseLineFinishType.Finished;
		option.currectLine.result = result;
		option.currectLine.AddressAdd();
		return true;
	}
	//#endregion HEX命令

	//#region MACRO命令
	private static async PreAnalyse_Macro(option: CompileOption): Promise<boolean> {
		let macro = MacroUtils.CreateMacro(option.exps![0], option.exps![1]);
		if (!macro)
			return false;

		const { comment } = BaseLine.GetComment(option.currectLine.originalString);
		macro.comment = comment;
		macro.baseLines = Commands.CollectBaseLines(option);
		option.currectLine.tag = macro;
		return await Compile.LebalAndMacroAnalyse(macro.baseLines, { macro });
	}

	private static async AnalyseMacro_Macro(option: CompileOption): Promise<boolean> {
		let macro: Macro = option.currectLine.tag;
		await Compile.AnalyseMacro(macro.baseLines, { macro });
		return true;
	}

	private static async AnalyseLebal_Macro(option: CompileOption): Promise<boolean> {
		let part = option.currectLine.expression.Split(/\s+/, 1);
		if (part[0].isNull)
			return false;

		let macro = MacroUtils.FindMacro(part[0].text);
		await Compile.AnalyseLebal(macro.baseLines, { macro });
		return true;
	}

	static async Command_Macro(option: CompileOption) {
		const line = option.currectLine;
		line.SetAddress();

		if (!line.tag) {
			let temp = MacroUtils.FindMacro(line.keyword.text);
			line.tag = Utils.DeepClone(temp);
		}
		let macro: Macro = line.tag;

		if (option.currectLine.expression.isNull) {

		} else {
			let part = Utils.SplitComma(option.currectLine.expression, false);
			for (let i = 0; i < part.parts.length; i++) {
				let result = LexerUtils.GetExpressionValue(part.parts[i], "getValue");
				if (result.success)
					macro.labels[macro.parameterHash[i]].value = result.value;
			}
		}

		await Compile.CompileAndGetResult(macro.baseLines, { macro });
		line.finishType = BaseLineFinishType.Finished;
		let index = 0;
		for (let i = 0; i < macro.baseLines.length; i++) {
			line.result.length += macro.baseLines[i].resultLength;
			if (macro.baseLines[i].finishType == BaseLineFinishType.Finished) {
				macro.baseLines[i].result.forEach(value => {
					line.result[index] = value;
					index++;
				});
			} else {
				line.finishType = BaseLineFinishType.NotFinished;
				index += macro.baseLines[i].resultLength;
			}
		}


		line.AddressAdd();
		return true;
	}
	//#endregion MACRO命令

	//#region ORG命令
	private static Command_Org(option: CompileOption): boolean {
		let temp = LexerUtils.GetExpressionValue(option.exps![0], "getValue");
		if (!temp.success || temp.value < 0) {
			MyException.PushException(option.exps![0], ErrorType.ArgumentError, ErrorLevel.Show);
			return false;
		}
		option.currectLine.finishType = BaseLineFinishType.Finished;
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

	//#region BASE命令
	private static Command_Base(option: CompileOption): boolean {
		let temp = LexerUtils.GetExpressionValue(option.exps![0], "getValue");
		if (temp.success && temp.value < 0) {
			MyException.PushException(option.exps![0], ErrorType.ArgumentError, ErrorLevel.Show);
			return false;
		}

		option.currectLine.finishType = BaseLineFinishType.Finished;
		GlobalVar.env.baseAddress = temp.value;
		GlobalVar.env.addressOffset = GlobalVar.env.baseAddress - GlobalVar.env.originalAddress;
		return true;
	}
	//#endregion BASE命令

	//#region INCLUDE命令
	private static async PreAnalyse_Include(option: CompileOption) {
		let check = await Commands.CheckFile(option.exps![0]);
		if (check.exsist) {
			if (check.path == GlobalVar.env.GetFile(option.currectLine.keyword.fileHash)) {
				MyException.PushException(option.exps![0], ErrorType.ArgumentError, ErrorLevel.Show);
			} else if (GlobalVar.env.isCompile) {
				let hash = GlobalVar.env.SetFile(check.path);
				let data = await FileUtils.ReadFile(check.path);
				let text = FileUtils.BytesToString(data);
				let allLines = Compile.GetAllBaseLine(text, hash);

				option.allBaseLine.splice(option.baseLineIndex + 1, 0, ...allLines);
				option.currectLine.lineType = BaseLineType.OnlyLebal;
			}
		}
		return check.exsist;
	}
	//#endregion INCLUDE命令

	//#region INCBIN命令
	private static async PreAnalyse_IncBin(option: CompileOption) {
		let check = await Commands.CheckFile(option.exps![0]);
		return check.exsist;
	}

	private static async Command_IncBin(option: CompileOption) {
		let check = await Commands.CheckFile(option.exps![0]);
		if (!check.exsist)
			return false;

		let data = await FileUtils.ReadFile(check.path);

		option.currectLine.SetAddress();

		let start = 0;
		let length = data.length;
		if (!option.exps![1].isNull) {
			let ex = LexerUtils.GetExpressionValue(option.exps![1], "getValue");
			if (!ex.success) {
				MyException.PushException(option.exps![1], ErrorType.ArgumentError, ErrorLevel.ShowAndBreak);
				return false;
			}
			start = ex.value;
			length = length - start;
		}

		if (!option.exps![2].isNull) {
			let ex = LexerUtils.GetExpressionValue(option.exps![2], "getValue");
			if (!ex.success) {
				MyException.PushException(option.exps![2], ErrorType.ArgumentError, ErrorLevel.ShowAndBreak);
				return false;
			}
			length = ex.value;
		}

		for (let i = 0, j = start; i < length && j < data.length; i++, j++)
			option.currectLine.result.push(data[j]);

		option.currectLine.AddressAdd();
		option.currectLine.finishType = BaseLineFinishType.Finished;
		return true;
	}
	//#endregion INCBIN命令

	//#region IF系列命令
	/**
	 * 将所有判断行备份保存
	 * @param option 编译选项
	 * @returns 
	 */
	private static PreAnalyse_IF(option: CompileOption) {
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
			option.allBaseLine[result[i].index].lineType = BaseLineType.Ignore;
		}

		option.currectLine.tag = tag;
		return true;
	}

	private static AnalyseLebal_IF(option: CompileOption) {
		let tag: ConfidentLine[] = option.currectLine.tag;
		for (let i = 0; i < tag.length - 1; i++) {
			const line = option.allBaseLine[tag[i].index];
			if (line.keyword.text != ".ELSE") {
				if (line.expression.isNull) {
					MyException.PushException(line.keyword, ErrorType.CommandParamsError, ErrorLevel.Show);
					continue;
				}
				LexerUtils.GetExpressionValues(line.expression, "check", option);
			}
		}
		return true;
	}

	private static async Command_IF(option: CompileOption) {
		let tag: ConfidentLine[] = option.currectLine.tag;

		for (let i = 0; i < tag.length - 1; i++) {
			const line = option.allBaseLine[tag[i].index];
			if (line.keyword.text == ".ELSE") {
				tag[i].confident = true;
				break;
			}
			let value = LexerUtils.GetExpressionValue(line.expression, "getValue", option);
			if (value.success && value.value) {
				tag[i].confident = true;
				break;
			}
		}

		Commands.RemoveBaseLines(option, tag);
		return true;
	}
	//#endregion IF系列命令

	//#region IFDEF命令
	private static PreAnalyse_IFDEF(option: CompileOption) {
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
			option.allBaseLine[result[i].index].lineType = BaseLineType.Ignore;
		}

		option.currectLine.tag = tag;
		return true;
	}

	private static Command_IFDEF(option: CompileOption) {
		let tag: ConfidentLine[] = option.currectLine.tag;

		for (let i = 0; i < tag.length - 1; i++) {
			const line = option.allBaseLine[tag[i].index];
			if (line.keyword.text == ".ELSE") {
				tag[i].confident = true;
				break;
			}
			let lebal = LebalUtils.FindLebal(line.expression, option);
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
	private static PreAnalyse_IFNDEF(option: CompileOption) {
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
			option.allBaseLine[result[i].index].lineType = BaseLineType.Ignore;
		}

		option.currectLine.tag = tag;
		return true;
	}

	private static Command_IFNDEF(option: CompileOption) {
		let tag: ConfidentLine[] = option.currectLine.tag;

		for (let i = 0; i < tag.length - 1; i++) {
			const line = option.allBaseLine[tag[i].index];
			if (line.keyword.text == ".ELSE") {
				tag[i].confident = true;
				break;
			}
			let lebal = LebalUtils.FindLebal(line.expression, option);
			if (!lebal) {
				tag[i].confident = true;
				break;
			}
		}

		Commands.RemoveBaseLines(option, tag);
		return true;
	}
	//#endregion IFNDEF命令

	//#region REPEAT命令
	private static PreAnalyse_REPEAT(option: CompileOption) {
		option.currectLine.tag = option.includeCommandLines![1].index - option.includeCommandLines![0].index;
		return true;
	}

	private static Command_REPEAT(option: CompileOption) {
		let length: number = option.currectLine.tag;
		let result = LexerUtils.GetExpressionValue(option.currectLine.expression, "getValue");
		if (!result.success || result.value < 0)
			return false;

		option.allBaseLine.splice(option.baseLineIndex, 1);
		let tempLines = option.allBaseLine.splice(option.baseLineIndex, length);
		tempLines.splice(tempLines.length - 1, 1);
		while (result.value != 0) {
			let tempArray = tempLines.map(value => Utils.DeepClone(value));
			option.allBaseLine.splice(option.baseLineIndex, 0, ...tempArray);
			result.value--;
		}
		option.baseLineIndex--;
		return true;
	}
	//#endregion REPEAT命令

	/***** 辅助功能 *****/

	//#region 查找下一个命令
	/**
	 * 查找下一个命令
	 * @param endCommand 结束命令
	 * @param option 编译选项
	 * @param includes 包含的命令
	 * @returns 是否找到
	 */
	private static FindNextMatchCommand(startCommand: string, endCommand: string, nested: boolean, option: CompileOption, includes?: IncludeCommand[]) {
		let result: MatchLine[] = [];
		let names = includes?.map(value => value.name);
		let deep = 0;
		let found = false;
		for (let i = option.baseLineIndex + 1; i < option.allBaseLine.length; i++) {
			let line = option.allBaseLine[i];
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
			result.unshift({ match: startCommand, index: option.baseLineIndex });
		else
			result = [];

		return result;
	}
	//#endregion 查找下一个命令

	//#region 对多行命令进行整理
	/**
	 * 对多行命令进行整理
	 */
	private static OrderCommands(option: CompileOption, matchLine: MatchLine[], includeCommand?: IncludeCommand[]) {
		for (let i = 0; i < matchLine.length; i++) {
			let index = matchLine[i];
			const line = option.allBaseLine[i];
			console.log(line);
		}
	}
	//#endregion 对多行命令进行整理

	//#region 检查文件是否存在
	private static async CheckFile(expression: OneWord) {
		let result = { exsist: true, path: "" };
		if (!expression.text.startsWith("\"") || !expression.text.endsWith("\"")) {
			MyException.PushException(expression, ErrorType.ExpressionError, ErrorLevel.Show);
			result.exsist = false;
			return result;
		}

		/**当前文件 */
		let file = GlobalVar.env.GetFile(expression.fileHash);
		/**检测文件 */
		let path1 = expression.Substring(1, expression.length - 2);
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

	//#region 分析表达式
	private static AnalyseLebals(compileOption: CompileOption) {
		if (compileOption.currectLine.expression.isNull)
			return true;

		let temp = LexerUtils.GetExpressionValues(compileOption.currectLine.expression, "check", compileOption);
		return temp.success;
	}
	//#endregion 分析表达式

	//#region 将头尾行的所有行纳入
	private static CollectBaseLines(option: CompileOption) {
		let start = option.includeCommandLines![0].index;
		let end = option.includeCommandLines![1].index;
		let tag = option.allBaseLine.splice(start + 1, end - start);
		tag.splice(tag.length - 1, 1);
		return tag;
	}
	//#endregion 将头尾行的所有行纳入

	//#region 移除对应行
	private static RemoveBaseLines(option: CompileOption, indexs: ConfidentLine[]) {
		option.allBaseLine.splice(indexs[indexs.length - 1].index, 1);
		for (let i = indexs.length - 2; i >= 0; i--) {
			if (!indexs[i].confident)
				option.allBaseLine.splice(indexs[i].index, indexs[i + 1].index - indexs[i].index);
			else
				option.allBaseLine.splice(indexs[i].index, 1);
		}
		option.baseLineIndex--;
	}
	//#endregion 移除对应行

}

interface CommandParams {
	/**第一阶段，基础分析 */
	BaseAnalyse?: (option: CompileOption) => Promise<boolean> | boolean;
	/**第二阶段 */
	AnalyseMacro?: (option: CompileOption) => Promise<boolean> | boolean;
	/**第三阶段，分析标签 */
	AnalyseLebal?: (compileOption: CompileOption) => Promise<boolean> | boolean;
	/**命令编译 */
	CommandCompile?: (option: CompileOption) => Promise<boolean> | boolean;

	startCommand: string;
	includeCommand?: IncludeCommand[];
	endCommand?: string;
	nested: boolean;
	enableLebal: boolean;
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