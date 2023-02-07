import { Platform } from '../Platform/Platform';
import { Token } from './Token';

enum BaseLineType {
	Unknow, Command, Instruction, Variable
}

export interface IBaseLine {
	type: BaseLineType;
	comment: Token;
}

export interface ICommandLine extends IBaseLine {
	label: Token;
	command: Token;
	expr: Token;
}

export interface IInstructionLine extends IBaseLine {
	label: Token;
	instruction: Token;
	expr: Token;
}

export interface IVariable extends IBaseLine {
	label: Token;
	expr: Token;
}

export interface IUnknowLine extends IBaseLine {
	orgToken: Token;
}

export class LineUtils {

	//#region 分解文本
	/**分解文本 */
	static ParseTexts(text: string) {
		let match: RegExpExecArray | null = null;
		let tokens: Token[];

		let result: IBaseLine[] = [];

		//#region 保存行Token
		const SaveToken = (lineType: number) => {
			let pre = tokens[0].Substring(0, match!.index);
			let currect = tokens[0].Substring(match!.index, match![0].length);
			let after = tokens[0].Substring(match!.index + match![0].length);

			switch (lineType) {
				case 0:
					let command: ICommandLine = {
						type: BaseLineType.Command,
						label: pre,
						comment: tokens[1],
						command: currect,
						expr: after
					};
					result.push(command);
					break;
				case 1:
					let instruction: IInstructionLine = {
						type: BaseLineType.Instruction,
						label: pre,
						comment: tokens[1],
						instruction: currect,
						expr: after
					};
					result.push(instruction);
					break;
				case 2:
					let variable: IVariable = { type: BaseLineType.Variable, label: pre, comment: tokens[1], expr: after };
					result.push(variable);
					break;
			}
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
				let unknow: IUnknowLine = { type: BaseLineType.Unknow, orgToken: tokens[0], comment: tokens[1] };
				result.push(unknow);
			}

		}
		return;
	}
	//#endregion 分解文本

	//#region 分割内容与注释
	/**分割内容与注释 */
	private static GetContent(token: Token) {
		return token.Split(/;[+-]?/, { count: 1 });
	}
	//#endregion 分割内容与注释

	

}