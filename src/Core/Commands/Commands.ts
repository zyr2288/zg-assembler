import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { ICommonLine } from "../Lines/CommonLine";

export interface ICommandTag {

}

/**命令行 */
export interface ICommandLine extends ICommonLine {
	/**标签 */
	labelToken?: Token;
	/**命令 */
	command: Token;
	/**表达式 */
	expression: Token;
	/**结果 */
	result?: number[];
	/**附加数据 */
	tag?: ICommandTag;
}

export class Commands {

	static readonly AllCommand = [".ORG", ".BASE", ".DB", ".DW", ".DL"];

	static Initialize() {

	}

	static FirstAnalyse(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;


	}

}
