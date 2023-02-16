import { Platform } from "../Platform/Platform";
import { Token } from "../Base/Token";
import { ICommonLine, LineType ,IUnknowLine} from "./CommonLine";
import { IInstructionLine } from "./Instruction";
import { ICommandLine,  } from "../Commands/Commands";
import { IVariableLine } from "./VariableLine";
import { DecodeOption, SplitOption } from "../Base/Options";

export class LineUtils {

	//#region 分解文本
	/**分解文本 */
	static SplitTexts(text: string, option: DecodeOption): void {
		let match: RegExpExecArray | null = null;
		let tokens: Token[];
		let newLine = {} as ICommonLine;

		//#region 保存行Token
		const SaveToken = (lineType: LineType) => {

			let pre = tokens[0].Substring(0, match!.index);
			let currect = tokens[0].Substring(match!.index, match![0].length);
			let after = tokens[0].Substring(match!.index + match![0].length);

			switch (lineType) {
				case LineType.Command:
					newLine = { type: LineType.Command, command: currect, expression: after, finished: false } as ICommandLine;
					break;
				case LineType.Instruction:
					newLine = { type: LineType.Instruction, instruction: currect, expression: after, finished: false } as IInstructionLine;
					break;
				case LineType.Variable:
					newLine = { type: LineType.Variable, expression: after, finished: false } as IVariableLine;
					break;
			}

			// @ts-ignore
			newLine.labelToken = pre;
			newLine.finished = false;

			if (!pre.isEmpty)
				// @ts-ignore
				newLine.labelToken = pre;

			if (!tokens[1].isEmpty)
				option.allLines[option.allLines.length - 1].comment = tokens[1].text;
		}
		//#endregion 保存行Token

		let allLines = text.split(/\r\n|\r|\n/);
		for (let index = 0; index < allLines.length; ++index) {
			newLine.orgText = Token.CreateToken(index, 0, allLines[index]);

			tokens = LineUtils.GetContent(newLine.orgText);
			if (tokens[0].isEmpty)
				continue;

			let regex = new RegExp(Platform.regexString, "i");
			match = regex.exec(tokens[0].text);

			if (match?.groups?.["command"]) {
				SaveToken(LineType.Command);
			} else if (match?.groups?.["instruction"]) {
				SaveToken(LineType.Instruction);
			} else if (match?.groups?.["variable"]) {
				SaveToken(LineType.Variable);
			} else {
				newLine = {
					type: LineType.Unknow,
					orgText: tokens[0],
					comment: tokens[1].text,
					finished: false
				} as IUnknowLine;
			}

			option.allLines.push(newLine);
			newLine = {} as ICommonLine;
		}
	}
	//#endregion 分解文本

	//#region 分割内容与注释
	/**分割内容与注释 */
	private static GetContent(token: Token) {
		return token.Split(/;[+-]?/, { count: 1 });
	}
	//#endregion 分割内容与注释

}