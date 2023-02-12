import { Platform } from '../Platform/Platform';
import { Token } from '../Base/Token';
import { ICommonLine, LineType } from './CommonLine';
import { IInstructionLine } from './InstructionLine';
import { ICommandLine } from './CommandsLine';
import { IVariableLine } from './VariableLine';
import { IUnknowLine } from './UnknowLine';

export class LineUtils {

	//#region 分解文本
	/**分解文本 */
	static ParseTexts(text: string) {
		let match: RegExpExecArray | null = null;
		let tokens: Token[];

		let result: ICommonLine[] = [];
		let index = 0;
		let allLines = LineUtils.SplitText(text);

		//#region 保存行Token
		const SaveToken = (lineType: LineType) => {
			let pre = tokens[0].Substring(0, match!.index);
			let currect = tokens[0].Substring(match!.index, match![0].length);
			let after = tokens[0].Substring(match!.index + match![0].length);

			let line!: IInstructionLine | ICommandLine | IVariableLine;

			switch (lineType) {
				case LineType.Instruction:
					line = { type: LineType.Instruction, instruction: currect, expression: after, finished: false } as IInstructionLine;
					break;
				case LineType.Command:
					line = { type: LineType.Command, command: currect, expression: after, finished: false } as ICommandLine;
					break;
				case LineType.Variable:
					line = { type: LineType.Variable, expression: after, finished: false } as IVariableLine;
					break;
			}

			line.labelToken = pre;
			line.finished = false;
			line.lineStart = allLines[index].lineStart;
			line.lineEnd = allLines[index].lineEnd;

			if (!pre.isEmpty)
				line.labelToken = pre;

			result.push(line);
			if (!tokens[1].isEmpty)
				result[result.length - 1].comment = tokens[1].text;
		}
		//#endregion 保存行Token

		for (; index < allLines.length; ++index) {

			tokens = LineUtils.GetContent(Token.CreateToken(index, 0, allLines[index].text));

			if (tokens[0].isEmpty)
				continue;

			let regex = new RegExp(Platform.regexString, "i");
			match = regex.exec(tokens[0].text);

			if (match?.groups?.["command"]) {
				SaveToken(0);
			} else if (match?.groups?.["instruction"]) {
				SaveToken(1);
			} else if (match?.groups?.["variable"]) {
				SaveToken(2);
			} else {
				let unknow: IUnknowLine = {
					type: LineType.Unknow,
					orgToken: tokens[0],
					comment: tokens[1].text,
					finished: false,
					lineStart: allLines[index].lineStart,
					lineEnd: allLines[index].lineEnd
				};
				result.push(unknow);
			}

		}
		return result;
	}
	//#endregion 分解文本

	//#region 分割内容与注释
	/**分割内容与注释 */
	private static GetContent(token: Token) {
		return token.Split(/;[+-]?/, { count: 1 });
	}
	//#endregion 分割内容与注释

	//#region 分割所有文本
	private static SplitText(text: string) {
		let result: { text: string, lineStart: number, lineEnd: number }[] = [];

		let regex = /\r?\n/;

		let start = 0;
		let match;
		while (match = regex.exec(text)) {
			let temp = text.substring(start, match.index);
			if (temp.trim() == "")
				continue;

			result.push({ text: temp, lineStart: start, lineEnd: match.index });
			start = match.index + match[0].length;
		}

		let temp = text.substring(start);
		if (temp.trim() != "")
			result.push({ text: temp, lineStart: start, lineEnd: text.length });

		return result;
	}
	//#endregion 分割所有文本

}