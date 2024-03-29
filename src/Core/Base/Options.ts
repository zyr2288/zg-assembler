import { Macro } from "../Commands/Macro";
import { ICommonLine } from "../Lines/CommonLine";
import { Compiler } from "./Compiler";

export class DecodeOption {
	macro?: Macro;
	allLines: ICommonLine[];
	lineIndex = 0;

	constructor(allLines: ICommonLine[]) {
		this.allLines = allLines;
	}

	/**
	 * 替换行
	 * @param newLine 新替换的行
	 * @param fileHash 文件Hash
	 * @returns 
	 */
	ReplaceLine(newLine: ICommonLine, fileHash: number) {
		const findLine = this.allLines[this.lineIndex];
		this.allLines[this.lineIndex] = newLine;
		const temp = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!temp)
			return;

		const index = temp.indexOf(findLine);
		if (index < 0)
			return;

		temp[index] = newLine;
	}

	InsertLines(fileHash: number, index: number, newLines: ICommonLine[]) {
		this.allLines.splice(index, 0, ...newLines);

		const temp = Compiler.enviroment.allBaseLines.get(fileHash) ?? [];
		for (let i = 0; i < newLines.length; ++i)
			temp.push(newLines[i]);
		
		Compiler.enviroment.allBaseLines.set(fileHash, temp);
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
	/**该行在所有行中的索引 */
	index: number,
	/**该行所在文件内的行号 */
	line:number
};