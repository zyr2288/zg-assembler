import { CommonLine } from "../Lines/CommonLine";
import { Macro } from "./Macro";

/**编译选项 */
export class CompileOption {
	index: number = 0;
	macro?: Macro;
	matchIndex?: number[];
	allLines!: CommonLine[];

	GetCurrent<T extends CommonLine>() {
		return this.allLines[this.index] as T;
	}

	GetLine<T extends CommonLine>(index: number) {
		return this.allLines[index] as T;
	}

	ReplaceLine(line: CommonLine, index: number) {
		// const lines = Compiler.enviroment.allLine.get(Compiler.enviroment.fileIndex)!
		this.allLines[index] = line;
	}
}