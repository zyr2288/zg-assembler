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

		//#region 保存行Token
		const SaveToken = (lineType: LineType) => {
			let pre = tokens[0].Substring(0, match!.index);
			let currect = tokens[0].Substring(match!.index, match![0].length);
			let after = tokens[0].Substring(match!.index + match![0].length);

			let line!: IInstructionLine | ICommandLine | IVariableLine;

			switch (lineType) {
				case LineType.Instruction:
					line = { type: LineType.Instruction, labelToken: pre, instruction: currect, expression: after };
					break;
				case LineType.Command:
					line = { type: LineType.Command, labelToken: pre, command: currect, expression: after }
					break;
				case LineType.Variable:
					line = { type: LineType.Variable, labelToken: pre, expression: after };
					break;
			}

			if (!pre.isEmpty)
				line.labelToken = pre;

			result.push(line);
			if (!tokens[1].isEmpty)
				result[result.length - 1].comment = tokens[1].text;
		}
		//#endregion 保存行Token

		let allLines: string[] = text.split(/\r?\n/);
		let index = 0;
		for (; index < allLines.length; ++index) {

			tokens = LineUtils.GetContent(Token.CreateToken(index, 0, allLines[index]));

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
				let unknow: IUnknowLine = { type: LineType.Unknow, orgToken: tokens[0], comment: tokens[1].text };
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



}