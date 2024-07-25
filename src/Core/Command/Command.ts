import { CompileOption } from "../Base/CompileOption";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { Analyser } from "../Compiler/Analyser";
import { DBCommand, DLCommand, DWCommand } from "./DataCommand";
import { DefinedCommand } from "./DefinedCommand";
import { HexCommand } from "./HexCommand";
import { IfConfident, IfDefConfident, IfNDefConfident } from "./IfConfident";
import { Incbin, Include } from "./Include";
import { MacroCommand } from "./MacroCommand";
import { ErrorCommand, MsgCommand } from "./MsgErrCommand";
import { Base, Original } from "./OrgAndBase";
import { RepeatCommand } from "./RepeatCommand";
import { EnumCommand } from "./EnumCommand";
import { Expression } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";

interface FindMatchOption {
	start: string;
	rest?: string[];
	end: string;
	sameEnd?: string[]
}

interface ArgCount {
	min: number;
	max?: number;
}

/**通用命令Tag，就一个表达式 */
export interface CommandTagBase {
	exp?: Expression;
}

export class Command {

	static commandMap = new Map<string, ICommand>();
	static commandParam = new Map<string, ArgCount>();
	private static commandMatchOption = new Map<string, FindMatchOption>();

	//#region 命令的初始化
	/**命令的初始化 */
	static Initialize() {
		Command.AddCommand(
			DefinedCommand, Original, Base, EnumCommand,
			DBCommand, DWCommand, DLCommand, HexCommand,
			IfConfident, IfDefConfident, IfNDefConfident,
			MacroCommand, MsgCommand, ErrorCommand,
			RepeatCommand
		);

		// @ts-ignore
		if (FileUtils.ReadFile) {
			Command.AddCommand(Include, Incbin);
		}
	}
	//#endregion 命令的初始化

	/***** 多次分析 *****/

	//#region 第一次分析
	/**
	 * 第一次分析
	 * @param option 编译选项
	 */
	static async AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const comText = line.command.text.toUpperCase();
		const com = Command.commandMap.get(comText);
		if (com?.end) {
			const comMatch = Command.commandMatchOption.get(comText)!;
			option.matchIndex = Command.FindNextMatch(option, comMatch!);
			if (!option.matchIndex)
				return;
		}

		if (line.label) {
			if (com!.allowLabel) {
				line.label.Analyse();
			} else {
				const error = Localization.GetMessage("Command {0} can not use label", line.command.text);
				MyDiagnostic.PushException(line.label.labelToken, error);
				line.lineType = LineType.Error;
			}
		}

		if (com?.AnalyseFirst)
			await com.AnalyseFirst(option);
	}
	//#endregion 第一次分析

	//#region 第二次分析
	/**
	 * 第二次分析
	 * @param option 编译选项
	 */
	static async AnalyseSecond(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const comText = line.command.text.toUpperCase();
		const com = Command.commandMap.get(comText);

		if (com?.AnalyseSecond)
			await com.AnalyseSecond(option);
	}
	//#endregion 第二次分析

	//#region 第三次分析
	/**
	 * 第三次分析
	 * @param option 编译选项
	 */
	static async AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const comText = line.command.text.toUpperCase();
		const com = Command.commandMap.get(comText);

		if (com?.AnalyseThird)
			await com.AnalyseThird(option);
	}
	//#endregion 第三次分析

	//#region 编译
	static async Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const comText = line.command.text.toUpperCase();
		const com = Command.commandMap.get(comText);

		line.label?.Compile(option);

		if (com?.Compile)
			await com.Compile(option);
	}
	//#endregion 编译

	/***** 辅助公开方法 *****/

	//#region 查询下一个匹配项目
	/**
	 * 查询下一个匹配项目
	 * @param start 起始行
	 * @param lines 所有行
	 * @param match 要匹配的字符
	 * @returns 
	 */
	static FindNextMatch(option: CompileOption, matchOption: { start: string, rest?: string[], end: string, sameEnd?: string[] }) {
		const matchIndex: number[] = [];

		let deep = 0;
		let nowLine = option.index;
		let find = false;

		while (true) {
			nowLine++;
			if (nowLine >= option.allLines.length)
				break;

			const line = option.GetLine(nowLine);
			if (!line || line.key !== "command")
				continue;

			let match = line.command.text.toUpperCase();
			if (match === matchOption.start || matchOption.sameEnd?.includes(match)) {
				deep++;
				continue;
			}

			if (match === matchOption.end) {
				if (deep === 0) {
					find = true;
					matchIndex.push(nowLine);
					break;
				}

				deep--;
				continue;
			}

			if (matchOption.rest?.includes(match) && deep === 0) {
				matchIndex.push(nowLine);
			}
		}

		if (deep !== 0 || !find) {
			const line = option.GetCurrent<CommandLine>();
			line.lineType = LineType.Error;

			const error = Localization.GetMessage("Unmatched command {0}", matchOption.start);
			MyDiagnostic.PushException(line.command, error);
			option.index = option.allLines.length;
			return;
		}

		return matchIndex;
	}
	//#endregion 查询下一个匹配项目

	//#region 分割参数
	/**
	 * 
	 * @param command 
	 * @param params 
	 * @returns 
	 */
	static SplitArgument(command: Token, params: Token) {
		const com = Command.commandParam.get(command.text.toUpperCase());
		if (!com) {
			const error = Localization.GetMessage("Command {0} Error", command.text)
			MyDiagnostic.PushException(command, error);
			return;
		}

		if (params.isEmpty) {
			if (com.min !== 0) {
				const error = Localization.GetMessage("Command arguments error");
				MyDiagnostic.PushException(command, error);
				return;
			}
			return [];
		}

		const splitParams = Analyser.SplitComma(params)!;
		if (splitParams.length < com.min || (com.max !== undefined && splitParams.length > com.max)) {
			const error = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(command, error);
			return;
		}

		return splitParams;
	}
	//#endregion 分割参数

	//#region 标记行分析
	static MarkLineFinished(option: CompileOption, start: number, end: number) {
		for (let j = start; j <= end; j++) {
			if (!option.allLines[j])
				continue;

			option.allLines[j].lineType = LineType.Ignore;
		}
	}
	//#endregion 标记行分析

	/***** private *****/

	//#region 添加命令
	/**添加命令 */
	private static AddCommand(...coms: (new () => ICommand)[]) {
		for (let i = 0; i < coms.length; i++) {
			const com = new coms[i]();
			Command.commandParam.set(com.start.name, { min: com.start.min, max: com.start.max });

			let matchOption = {} as FindMatchOption;

			if (com.rest) {
				matchOption.rest = [];
				com.rest.map(v => {
					Command.commandParam.set(v.name, { min: v.min, max: v.max });
					matchOption.rest?.push(v.name);
				});
			}

			if (com.sameEnd) {
				matchOption.sameEnd = com.sameEnd;
			}

			if (com.end) {
				Command.commandParam.set(com.end, { min: 0, max: 0 });
				matchOption.start = com.start.name;
				matchOption.end = com.end;
				Command.commandMatchOption.set(com.start.name, matchOption);
			}

			if (com.allowLabel === undefined)
				com.allowLabel = true;

			Command.commandMap.set(com.start.name, com);
		}
	}
	//#endregion 添加命令

}

export interface ICommand {

	/**命令名称 */
	start: ICommandName;
	/**命令其中的部分名称 */
	rest?: ICommandName[];
	/**结尾 */
	end?: string;
	/**以同样结尾的命令 */
	sameEnd?: string[];
	/**命令前是否允许标签，默认允许(true) */
	allowLabel?: boolean;

	/**词法分析第一次 */
	AnalyseFirst?: (option: CompileOption) => void | Promise<void>;

	/**词法分析第二次 */
	AnalyseSecond?: (option: CompileOption) => void | Promise<void>;

	/**词法分析第三次 */
	AnalyseThird?: (option: CompileOption) => void | Promise<void>;

	/**编译结果 */
	Compile?: (option: CompileOption) => void | Promise<void>;
}

export interface ICommandName {
	name: string;
	min: number;
	max?: number;
}