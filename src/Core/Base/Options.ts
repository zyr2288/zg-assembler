import { IMacro } from "../Commands/Macro";
import { ICommonLine } from "../Lines/CommonLine";
import { Compiler } from "./Compiler";

export class DecodeOption {
	macro?: IMacro;
	allLines: ICommonLine[];
	lineIndex = 0;

	constructor(allLines: ICommonLine[]) {
		this.allLines = allLines;
	}

	ReplaceLine(newLine: ICommonLine, fileHash: number) {
		let findLine = this.allLines[this.lineIndex];
		this.allLines[this.lineIndex] = newLine;
		let temp = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!temp)
			return;

		let index = temp.indexOf(findLine);
		if (index < 0)
			return;

		temp[index] = newLine;
	}

	InsertLines(fileHash: number, index: number, newLines: ICommonLine[]) {
		this.allLines.splice(index, 0, ...newLines);

		let temp: ICommonLine[] | undefined;
		for (let i = 0; i < newLines.length; ++i) {
			temp = Compiler.enviroment.allBaseLines.get(fileHash);
			if (!temp) {
				temp = [];
				Compiler.enviroment.allBaseLines.set(fileHash, temp);
			}

			temp.push(newLines[i]);
		}
	}

	GetLine<T extends ICommonLine>(index: number) {
		return this.allLines[index] as T;
	}

	GetCurrectLine<T extends ICommonLine>() {
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