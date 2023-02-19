import { SplitLine } from "../Base/Compiler";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { MyException } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../i18n/Localization";
import { ICommonLine, LineType } from "../Lines/CommonLine";

interface CommandParams {
	/**第一阶段，基础分析 */
	FirstAnalyse?: (option: DecodeOption) => Promise<boolean> | boolean;
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
	expression: Token;
	/**结果 */
	result?: number[];
	/**附加数据 */
	tag?: any;
}

export class Commands {

	static allCommandNames: string[] = [];

	/**命令的参数个数最小与最大，key是命令 */
	private static commandsParamsCount = new Map<string, { min: number, max: number }>();
	private static allCommands = new Map<string, CommandParams>();
	private static ignoreEndCom = new Set<string>();

	static Initialize() {
		
	}

	//#region 第一次分析
	static async FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		if (Commands.ignoreEndCom.has(line.command.text)) {
			line.finished = true;
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

			option.includeCommandLines = includeLines;
			for (let i = 1; i < includeLines.length; i++) {
				Commands.AnalyseParams(option.allLines[includeLines[i].index] as ICommandLine);
			}
		}

		let args = Commands.AnalyseParams(line);
		if (!args)
			return false;

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

		if (com.FirstAnalyse)
			return await com.FirstAnalyse(option);

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
		/**是否忽略命令后的参数 */
		ignoreEnd?: boolean,
		/**允许有标签，默认允许 */
		label?: boolean,
		/**参数最小个数 */
		min: number,
		/**参数最大个数 */
		max?: number,
		/**是否允许嵌套，默认允许 */
		nested?: boolean,
		/**允许使用在Macro内，默认允许 */
		ableMacro?: boolean
		/**基础分析 */
		firstAnalyse?: (option: DecodeOption) => Promise<boolean> | boolean,
		secondAnalyse?: (option: DecodeOption) => Promise<boolean> | boolean,
		thirdAnalyse?: (baseLine: DecodeOption) => Promise<boolean> | boolean,
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
			if (!line.expression.isEmpty) {
				let errorMsg = Localization.GetMessage("Macro arguments error");
				MyException.PushException(line.command, errorMsg);
				return;
			}
			return [line.expression.Copy()];
		}

		let args = line.expression.Split(/(?=\"([^\"]*)\")\s+/g, { count: params.max - 1 });
		if (args[params.min - 1].isEmpty) {
			let errorMsg = Localization.GetMessage("Macro arguments error");
			MyException.PushException(line.command, errorMsg);
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
