import { Compiler } from "../Base/Compiler";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption, IncludeLine } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType, LineType } from "../Lines/CommonLine";
import { BaseAndOrg } from "./BaseAndOrg";
import { Data } from "./Data";
import { DataGroupCommand } from "./DataGroup";
import { Defined } from "./Defined";
import { Hexadecimal } from "./Hexadecimal";
import { IfCondition } from "./IfCondition";
import { Include } from "./Include";
import { MacroCommand } from "./Macro";
import { Message } from "./Message";
import { Repeat } from "./Repeat";

interface CommandParams {
	/**第一阶段，基础分析 */
	FirstAnalyse?: (option: DecodeOption, include?: IncludeLine[]) => Promise<void> | void;
	/**第二阶段 */
	SecondAnalyse?: (option: DecodeOption) => Promise<void> | void;
	/**第三阶段，分析标签 */
	ThirdAnalyse?: (compileOption: DecodeOption) => Promise<void> | void;
	/**命令编译 */
	CommandCompile?: (option: DecodeOption) => Promise<void> | void;

	startCommand: string;
	includeCommand?: IncludeCommand[];
	endCommand?: string;
	nested: boolean;
	enableLabel: boolean;
	enableInMacro: boolean;
}

interface MatchLine {
	match: string;
	index: number;
	line: number;
}

interface IncludeCommand {
	name: string;
	min: number;
	max?: number;
}

export class Commands {

	static allCommandNames = new Set<string>();

	/**命令的参数个数最小与最大，key是命令 */
	private static commandsParamsCount = new Map<string, { min: number, max: number }>();
	private static allCommands = new Map<string, CommandParams>();
	private static notMatchLine = new Map<string, string>();

	//#region 初始化
	static Initialize() {
		const classes = [BaseAndOrg, Data, DataGroupCommand, Defined, Hexadecimal, IfCondition, Include, MacroCommand, Message, Repeat];
		for (let i = 0; i < classes.length; ++i) {
			let func = Reflect.get(classes[i], "Initialize");
			func();
		}

		Commands.allCommandNames.clear();
		Commands.allCommands.forEach((value, key, map) => {
			Commands.allCommandNames.add(key);
			if (value.includeCommand)
				for (let i = 0; i < value.includeCommand.length; ++i)
					Commands.allCommandNames.add(value.includeCommand[i].name);

			if (value.endCommand)
				Commands.allCommandNames.add(value.endCommand);
		});
	}
	//#endregion 初始化

	/***** 三次基本分析 *****/

	//#region 第一次分析
	static async FirstAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();

		// 不应找到未配对的行
		let temp = Commands.notMatchLine.get(line.command.text);
		if (temp) {
			line.compileType = LineCompileType.Error;
			let errorMsg = Localization.GetMessage("Unmatched command {0}", line.command.text);
			MyDiagnostic.PushException(line.command, errorMsg);
			return;
		}

		const com = Commands.allCommands.get(line.command.text)!;

		// 不允许在Macro内的命令检查
		if (option.macro && !com.enableInMacro) {
			let errorMsg = Localization.GetMessage("Command {0} can not use in Macro", line.command.text);
			MyDiagnostic.PushException(line.command, errorMsg);
			return;
		}

		// 命令不允许有标签
		if (line.labelToken && line.labelToken.isEmpty === false) {
			if (!com.enableLabel) {
				let errorMsg = Localization.GetMessage("Command {0} can not use label", line.command.text);
				MyDiagnostic.PushException(line.labelToken!, errorMsg);
			} else {
				LabelUtils.GetLineLabelToken(option);
			}
		}

		let includeLines: IncludeLine[] | undefined;

		// 查询匹配标签
		if (com.endCommand) {
			includeLines = Commands.FindNextMatchCommand(com.startCommand, com.endCommand, com.nested, option, com.includeCommand);
			if (includeLines.length === 0) {
				line.compileType = LineCompileType.Error;
				let errorMsg = Localization.GetMessage("Unmatched command {0}", com.endCommand);
				MyDiagnostic.PushException(line.command, errorMsg);
				return;
			}

			for (let i = 1; i < includeLines.length; ++i) {
				const tempLine = option.GetLine<CommandLine>(includeLines[i].index);
				tempLine.tag = Commands.SplitParams(tempLine);
			}
		}

		let args = Commands.SplitParams(line);
		if (!args) return;

		line.tag = args;
		await com.FirstAnalyse?.(option, includeLines);
	}
	//#endregion 第一次分析

	//#region 第二次分析
	static async SecondAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const com = Commands.allCommands.get(line.command.text)!;
		await com.SecondAnalyse?.(option);
	}
	//#endregion 第二次分析

	//#region 第三次分析
	static async ThirdAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const com = Commands.allCommands.get(line.command.text)!;
		await com.ThirdAnalyse?.(option);
	}
	//#endregion 第三次分析

	//#region 编译命令
	/**编译命令 */
	static async CompileCommands(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const com = Commands.allCommands.get(line.command.text);
		await com?.CommandCompile?.(option);
	}
	//#endregion 编译命令

	/***** 辅助函数 *****/

	//#region 增加命令
	/**
	 * 增加命令
	 * @param option 选项
	 */
	static AddCommand(option: {
		/**命令名称 例如:".ORG" */
		name: string,
		/**中间包含的命令 */
		includes?: IncludeCommand[],
		/**命令结尾 */
		end?: string,
		/**是否忽略命令后的参数，默认忽略 */
		ignoreEnd?: boolean,
		/**允许有标签，默认允许 */
		label?: boolean,
		/**参数最小个数 */
		min: number,
		/**参数最大个数，-1为无限制 */
		max?: number,
		/**是否允许嵌套，不默认允许 */
		nested?: boolean,
		/**允许使用在Macro内，默认允许 */
		ableMacro?: boolean
		/**基础分析 */
		firstAnalyse?: (option: DecodeOption, include?: IncludeLine[]) => Promise<void> | void,
		secondAnalyse?: (option: DecodeOption) => Promise<void> | void,
		thirdAnalyse?: (baseLine: DecodeOption) => Promise<void> | void,
		/**编译，返回true为错误 */
		compile?: (option: DecodeOption) => Promise<void> | void,
	}) {
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

		Commands.commandsParamsCount.set(option.name, { min: option.min, max: option.max ?? option.min });
		if (option.end) {
			Commands.commandsParamsCount.set(option.end, { min: 0, max: 0 });
			if (option.end)
				Commands.notMatchLine.set(option.end, option.name);
		}

		if (option.includes) {
			option.includes.forEach(value => {
				Commands.commandsParamsCount.set(value.name, { min: value.min, max: value.max ?? value.min });
				Commands.notMatchLine.set(value.name, option.name);
			});
		}

		Commands.allCommands.set(option.name, actionParams);
	}
	//#endregion 增加命令

	//#region 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令
	/**
	 * 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令，将分割结果放入tag
	 * @param option 通用选项
	 */
	static FirstAnalyse_Common(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let expressions: Token[] = line.tag;
		for (let i = 0; i < expressions.length; ++i) {
			let temp = ExpressionUtils.SplitAndSort(expressions[i]);
			if (temp)
				line.expParts[i] = temp;
			else
				line.compileType = LineCompileType.Error;
		}
		delete (line.tag);
	}
	//#endregion 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令

	//#region 第三次的通用分析，仅对编译命令行的表达式小节分析
	static async ThirdAnalyse_Common(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		for (let i = 0; i < line.expParts.length; ++i)
			ExpressionUtils.CheckLabelsAndShowError(line.expParts[i], option);
	}
	//#endregion 第三次的通用分析，仅对编译命令行的表达式小节分析

	//#region 将头尾行的所有行纳入
	/**
	 * 将头尾行的所有行纳入
	 * @param option 编译选项
	 * @param includeLines 所有包含的行
	 * @returns 
	 */
	static CollectBaseLines(option: DecodeOption, includeLines: IncludeLine[]) {
		let start = includeLines![0].index;
		let end = includeLines![1].index;
		let tag = option.allLines.splice(start + 1, end - start);
		tag.splice(tag.length - 1, 1);
		return tag;
	}
	//#endregion 将头尾行的所有行纳入

	//#region 设定起始地址并判断Label
	/**
	 * 
	 * @param line 设定行
	 * @returns 返回true为错误
	 */
	static SetOrgAddressAndLabel(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		line.SetAddress();
		if (line.compileType === LineCompileType.Error)
			return true;

		if (line.labelHash) {
			let label = Compiler.enviroment.allLabel.get(line.labelHash);
			if (label)
				label.value = line.orgAddress;

			delete (line.labelHash);
		}
		return false;
	}
	//#endregion 设定起始地址并判断Label

	/***** Private *****/

	//#region 分析参数是否满足，并做最大分割
	/**
	 * 分析参数是否满足，并做最大分割，此时删除 expression
	 * @param line 一行命令
	 * @returns 是否满足
	 */
	private static SplitParams(line: CommandLine) {
		let params = Commands.commandsParamsCount.get(line.command.text)!;
		let args: Token[] = [];

		if (!line.expression!.isEmpty)
			args = Utils.SplitWithComma(line.expression!);

		delete (line.expression);
		if (args.length < params.min || (params.max !== -1 && args.length > params.max)) {
			let errorMsg = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(line.command, errorMsg);
			line.compileType = LineCompileType.Error;
			return;
		}

		for (let i = 0; i < args.length; ++i) {
			if (args[i].isEmpty) {
				let errorMsg = Localization.GetMessage("Command arguments error");
				MyDiagnostic.PushException(line.command, errorMsg);
				line.compileType = LineCompileType.Error;
			}
		}

		if (line.compileType === LineCompileType.Error)
			return;

		return args;
	}
	//#endregion 分析参数是否满足，并做最大分割

	//#region 查找下一个命令
	/**
	 * 查找下一个命令
	 * @param startCommand 起始命令
	 * @param endCommand 结束命令
	 * @param nested 是否允许嵌套
	 * @param option 编译选项
	 * @param includes 包含的命令
	 * @returns 找到每一个匹配的行
	 */
	private static FindNextMatchCommand(startCommand: string, endCommand: string, nested: boolean, option: DecodeOption, includes?: IncludeCommand[]) {
		let result: MatchLine[] = [];
		let names = includes?.map(value => value.name);
		let deep = 0;
		let found = false;
		for (let i = option.lineIndex + 1; i < option.allLines.length; i++) {
			let line = option.GetLine<CommandLine>(i);
			if (line.type !== LineType.Command)
				continue;

			const commandToken = line.command;
			if (commandToken.text === startCommand) {
				if (!nested) {
					let errorMsg = Localization.GetMessage("Command {0} do not support nesting", commandToken.text);
					MyDiagnostic.PushException(commandToken, errorMsg);
					continue;
				}

				deep++;
				// result.push({ match: line.keyword.text, index: i });
				continue;
			}

			if (commandToken.text === endCommand) {
				if (deep > 0) {
					deep--;
					continue;
				}
				result.push({ match: commandToken.text, index: i, line: commandToken.line });
				found = true;
				break;
			}

			if (deep !== 0 || !names?.includes(commandToken.text))
				continue;

			result.push({ match: commandToken.text, index: i, line: commandToken.line });
		}

		if (found)
			result.unshift({
				match: startCommand,
				index: option.lineIndex,
				line: (option.allLines[option.lineIndex] as CommandLine).command.line
			});
		else
			result = [];

		return result;
	}
	//#endregion 查找下一个命令

}