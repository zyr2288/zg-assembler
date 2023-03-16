import { IMacro } from "../Commands/Macro";
import { ICommonLine } from "../Lines/CommonLine";
import { Compiler } from "./Compiler";

export class DecodeOption {
	macro?: IMacro;
	allLines: ICommonLine[] = [];
	lineIndex = 0;

	constructor(allLines: ICommonLine[]) {
		this.allLines = allLines;
	}

	ReplaceLine(newLine: ICommonLine, fileHash: number) {
		this.allLines[this.lineIndex] = newLine;
		let temp = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!temp)
			return;

		temp[this.lineIndex] = newLine;
	}

	GetLine<T extends ICommonLine>(index: number) {
		return this.allLines[index] as T;
	}

	GetCurrectLine<T>() {
		return this.allLines[this.lineIndex] as T;
	}
}

export type IncludeLine = {
	/**匹配的字符串 */
	match: string,
	/**行的索引 */
	index: number,
	/**行所在行号 */
	line: number
};