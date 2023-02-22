import { SplitLine } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { MyException } from "../Base/MyException";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../i18n/Localization";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "../Lines/CommonLine";
import { BaseAndOrg } from "./BaseAndOrg";
import { Defined } from "./Defined";
import { Message } from "./Message";

interface CommandParams {
	/**第一阶段，基础分析 */
	FirstAnalyse?: (option: CommandDecodeOption) => Promise<boolean> | boolean;
	/**第二阶段 */
	SecondAnalyse?: (option: DecodeOption) => Promise<boolean> | boolean;
	/**第三阶段，分析标签 */
	ThirdAnalyse?: (compileOption: DecodeOption) => Promise<boolean> | boolean;
	/**命令编译 */
	CommandCompile?: (option: DecodeOption) => Promise<boolean> | boolean;

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
}

interface IncludeCommand {
	name: string;
	min: number;
	max?: number;
}

export interface ICommandTag {

}

/**命令行 */
export interface ICommandLine extends ICommonLine {
	splitLine?: SplitLine;
	/**标签 */
	label?: ILabel;
	/**命令 */
	command: Token;
	/**表达式 */
	expParts: ExpressionPart[][];
	orgAddress: number;
	baseAddress: number
	/**结果 */
	result: number[];
	/**附加数据 */
	tag?: any;
}

export class Commands {

	static allCommandNames: string[] = [];

	/**命令的参数个数最小与最大，key是命令 */
	private static commandsParamsCount = new Map<string, { min: number, max: number }>();
	private static allCommands = new Map<string, CommandParams>();
	private static ignoreEndCom = new Set<string>();

	//#region 初始化
	static Initialize() {
		const classes = [BaseAndOrg, Defined, Message];
		for (let i = 0; i < classes.length; ++i) {
			let func = Reflect.get(classes[i], "Initialize");
			func();
		}

		Commands.allCommandNames = [];
		Commands.allCommands.forEach((value, key, map) => {
			Commands.allCommandNames.push(key)
		});
	}
	//#endregion 初始化

	//#region 第一次分析
	static async FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;

		line.expParts = [];
		line.command = line.splitLine!.comOrIntrs;
		line.command.text = line.command.text.toUpperCase();
		line.GetTokens = Commands.GetTokens.bind(line);

		if (Commands.ignoreEndCom.has(line.command.text)) {
			line.compileType = LineCompileType.Finished;
			delete (line.splitLine);
			return true;
		}

		let com = Commands.allCommands.get(line.command.text)!;
		if (option.macro && !com.enableInMacro) {
			let errorMsg = Localization.GetMessage("Command {0} can not use in Macro", line.command.text);
			MyException.PushException(line.command, errorMsg);
			return false;
		}

		// 寻找匹配结尾
		if (com.endCommand) {
			let includeLines = Commands.FindNextMatchCommand(com.startCommand, com.endCommand, com.nested, option, com.includeCommand);
			if (includeLines.length === 0) {
				let errorMsg = Localization.GetMessage("Unmatched end of command {0}", line.command.text);
				MyException.PushException(line.command, errorMsg);
				option.lineIndex = option.allLines.length - 1;
				return false;
			}

			(option as CommandDecodeOption).includeCommandLines = includeLines;
			for (let i = 1; i < includeLines.length; i++) {
				Commands.AnalyseParams(option.allLines[includeLines[i].index] as ICommandLine);
			}
		}

		let args = Commands.AnalyseParams(line);
		if (!args)
			return false;

		(option as CommandDecodeOption).expressions = args;

		// 命令不允许有标签
		if (line.splitLine?.label && !line.splitLine.label.isEmpty) {
			if (!com.enableLabel) {
				let errorMsg = Localization.GetMessage("Unmatched end of command {0}", line.command.text);
				MyException.PushException(line.splitLine.label, errorMsg);
				delete (line.label);
				return false;
			} else {
				let label = LabelUtils.CreateLabel(line.splitLine.label, option);
				if (label) {
					label.labelType = LabelType.Label;
					line.label = label;
				}
			}
		}

		if (com.FirstAnalyse) {
			let temp = await com.FirstAnalyse(option as CommandDecodeOption);
			delete (line.splitLine);
			return temp;
		}

		delete (line.splitLine);
		return true;
	}
	//#endregion 第一次分析

	//#region 第二次分析
	static async SecondAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		let com = Commands.allCommands.get(line.command.text)!;
		if (com.SecondAnalyse)
			return await com.SecondAnalyse(option);

		return true;
	}
	//#endregion 第二次分析

	//#region 第三次分析
	static async ThirdAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		let com = Commands.allCommands.get(line.command.text)!;
		if (com.ThirdAnalyse)
			return await com.ThirdAnalyse(option);

		return true;
	}
	//#endregion 第三次分析

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
		/**是否允许嵌套，默认允许 */
		nested?: boolean,
		/**允许使用在Macro内，默认允许 */
		ableMacro?: boolean
		/**基础分析 */
		firstAnalyse?: (option: CommandDecodeOption) => Promise<boolean> | boolean,
		secondAnalyse?: (option: DecodeOption) => Promise<boolean> | boolean,
		thirdAnalyse?: (baseLine: DecodeOption) => Promise<boolean> | boolean,
		/**编译，返回true为错误 */
		compile?: (option: DecodeOption) => Promise<boolean> | boolean,
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
			if (option.ignoreEnd && !Commands.ignoreEndCom.has(option.end))
				Commands.ignoreEndCom.add(option.end);
		}

		if (option.includes) {
			option.includes.forEach(value => {
				Commands.commandsParamsCount.set(value.name, { min: value.min, max: value.max ?? value.min });
			});
		}

		Commands.allCommands.set(option.name, actionParams);
	}
	//#endregion 增加命令

	//#region 基础获取命令的高亮Token
	static GetTokens(this: ICommandLine) {
		let result: HighlightToken[] = [];

		if (this.label)
			result.push({ token: this.label.token, type: HighlightType.Label });

		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}
	//#endregion 基础获取命令的高亮Token

	//#region 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令
	/**
	 * 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令，将分割结果放入tag
	 * @param option 通用选项
	 */
	static async FirstAnalyse_Common(option: CommandDecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;

		for (let i = 0; i < option.expressions.length; ++i) {
			let temp = ExpressionUtils.SplitAndSort(option.expressions[i]);
			if (temp)
				line.expParts[i] = temp;
			else
				line.compileType = LineCompileType.Error;
		}

		return true;
	}
	//#endregion 第一次的通用分析，仅拆分表达式，仅针对只有一个参数的命令

	//#region 第三次的通用分析，仅对编译命令行的表达式小节分析
	static async ThirdAnalyse_Common(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		for (let i = 0; i < line.expParts.length; ++i) {
			ExpressionUtils.CheckLabelsAndShowError(line.expParts[i], option);
		}
		return true;
	}
	//#endregion 第三次的通用分析，仅对编译命令行的表达式小节分析

	/***** Private *****/

	//#region 分析参数是否满足，并做最大分割
	/**
	 * 分析参数是否满足，并做最大分割
	 * @param line 一行命令
	 * @returns 是否满足
	 */
	private static AnalyseParams(line: ICommandLine) {
		let params = Commands.commandsParamsCount.get(line.command.text)!;
		if (params.max === 0) {
			if (!line.splitLine!.expression.isEmpty) {
				let errorMsg = Localization.GetMessage("Command arguments error");
				MyException.PushException(line.command, errorMsg);
				line.compileType = LineCompileType.Error;
				return;
			}
			return [line.splitLine!.expression.Copy()];
		}

		let args: Token[] = [];
		let inString = false;
		let char: string = "";
		let lastChar: string = "";
		let start = 0;

		for (let i = 0, j = 0; i < line.splitLine!.expression.text.length && j < params.max; ++i) {
			char = line.splitLine!.expression.text.charAt(i);
			if (char === "\"" && lastChar !== "\\") {
				inString = true;
			} else if (char === "," && !inString) {
				args.push(line.splitLine!.expression.Substring(start, i - start));
				start = i + 1;
				if (params.max > 0 && j >= params.max)
					break;
			}
			lastChar = char;
		}
		args.push(line.splitLine!.expression.Substring(start));

		if (args[params.min - 1].isEmpty) {
			let errorMsg = Localization.GetMessage("Command arguments error");
			MyException.PushException(line.command, errorMsg);
			line.compileType = LineCompileType.Error;
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
	private static FindNextMatchCommand(startCommand: string, endCommand: string, nested: boolean, option: DecodeOption, includes?: IncludeCommand[]) {
		let result: MatchLine[] = [];
		let names = includes?.map(value => value.name);
		let deep = 0;
		let found = false;
		for (let i = option.lineIndex + 1; i < option.allLines.length; i++) {
			let line = option.allLines[i] as ICommandLine;
			if (line.type != LineType.Command)
				continue;

			if (line.command.text === startCommand) {
				if (!nested) {
					let errorMsg = Localization.GetMessage("Command {0} do not support nesting", line.command.text);
					MyException.PushException(line.command, errorMsg);
					continue;
				}

				deep++;
				// result.push({ match: line.keyword.text, index: i });
				continue;
			}

			if (line.command.text === endCommand) {
				if (deep > 0) {
					deep--;
					continue;
				}
				result.push({ match: line.command.text, index: i });
				found = true;
				break;
			}

			if (deep != 0 || !names?.includes(line.command.text))
				continue;

			result.push({ match: line.command.text, index: i });
		}
		if (found)
			result.unshift({ match: startCommand, index: option.lineIndex });
		else
			result = [];

		return result;
	}
	//#endregion 查找下一个命令

}
