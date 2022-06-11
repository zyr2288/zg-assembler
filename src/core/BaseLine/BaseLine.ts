import { Commands } from "../Base/Commands";
import { GlobalVar } from "../Base/GlobalVar";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Token } from "../Base/Token";
import { Platform } from "../Platform/Platform";
import { CommandLine } from "./CommandLine";
import { ExpressionLine } from "./ExpressionLine";
import { InstructionLine } from "./InstructionLine";
import { MacroLine } from "./MacroLine";

export enum BaseLineType { Unknow, Instruction, Command, Expression, Macro, OnlyLabel }

export interface IBaseLine {

	orgText: Token;
	/**行类型 */
	lineType: BaseLineType;
	/**错误行 */
	errorLine: boolean;
	/**是否已分析完成 */
	isFinished: boolean;
	/**注释 */
	comment?: string;

	/**获取Token */
	GetToken(): Token[];
}

export class BaseLineUtils {

	//#region 获取行的基本类型
	/**
	 * 获取行的基本类型
	 * @param text 一行文本
	 * @param fileHash 文件Hash
	 * @param lineNumber 行号，从1开始
	 * @returns 
	 */
	static GetLineType(text: string, fileHash: number, lineNumber: number): IBaseLine | undefined {
		let temp = Token.CreateToken(text, fileHash, lineNumber);
		const { content, comment } = BaseLineUtils.GetContent(temp);
		if (content.isNull)
			return;

		let match = Commands.commandsRegex.exec(content.text)
		if (match) {
			let matchPart = BaseLineUtils.GetMatchLineParts(content, match);
			let line = CommandLine.CreateLine(matchPart, comment);
			line.orgText = content;
			return line;
		}

		match = Platform.instructionAnalyser.instructionsRegex.exec(content.text);
		if (match) {
			let matchParts = BaseLineUtils.GetMatchLineParts(content, match);
			let line = InstructionLine.CreateLine(matchParts, comment);
			line.orgText = content;
			return line;
		}

		match = /\s*\=\s*/g.exec(content.text);
		if (match) {
			let matchPart = BaseLineUtils.GetMatchLineParts(content, match);
			let line = ExpressionLine.CreateLine(matchPart, comment);
			line.orgText = content;
			return line;
		}

		return <IBaseLine>{ lineType: BaseLineType.Unknow, orgText: content, comment: comment };
	}
	//#endregion 获取行的基本类型

	//#region 分割一行内容
	static GetMatchLineParts(lineText: Token, match: RegExpExecArray) {
		let result = { pre: <Token>{}, match: <Token>{}, after: <Token>{} };

		result.pre = lineText.Substring(0, match.index);
		result.match = lineText.Substring(match.index, match[0].length);
		result.after = lineText.Substring(match.index + match[0].length);

		return result;
	}
	//#endregion 分割一行内容

	//#region 设定一行起始位置
	static AddressSet(line: InstructionLine | CommandLine | MacroLine) {
		if (GlobalVar.env.originalAddress < 0) {
			MyException.PushException(line.keyword, ErrorType.UnknowOriginalAddress, ErrorLevel.ShowAndBreak);
			return false;
		}

		if (line.orgAddress < 0) {
			line.orgAddress = GlobalVar.env.originalAddress;
			line.baseAddress = GlobalVar.env.baseAddress;
		}
		return true;
	}
	//#endregion 设定一行起始位置

	//#region 地址增加
	static AddressAdd(line: InstructionLine | CommandLine) {
		if (line.orgAddress >= 0) {
			GlobalVar.env.originalAddress = line.orgAddress;
			GlobalVar.env.baseAddress = line.baseAddress;
		}

		GlobalVar.env.AddAddress(line.result.length);
	}
	//#endregion 地址增加

	//#region 设定行结果值
	static SetResult(line: InstructionLine | CommandLine, value: number, index: number, length: number) {
		let temp = length;
		let tempIndex = 0;
		while (temp--) {
			line.result[index + tempIndex] = 0;
			tempIndex++;
		}

		while (length--) {
			line.result[index] = value & 0xFF;
			value >>= 8;
			index++;
		}
	}
	//#endregion 设定行结果值

	/***** Private *****/

	//#region 获取注释
	static GetContent(line: Token) {
		let words = line.Split(/;[\+\-]?/g, 1);
		return { content: words[0], comment: words[1]?.text }
	}
	//#endregion 获取注释

}