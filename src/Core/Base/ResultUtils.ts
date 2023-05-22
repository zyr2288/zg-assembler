import { CommandLine } from "../Lines/CommandLine";
import { ICommonLine } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { Compiler } from "./Compiler";

export class ResultUtils {

	/**获取所有行的结果 */
	static GetResult(allLines: ICommonLine[]) {
		if (Compiler.enviroment.fileRange.end < 0)
			return;

		let result: Int16Array = new Int16Array(Compiler.enviroment.fileRange.end);
		result.fill(-1);
		for (let i = 0; i < allLines.length; ++i) {
			const line = allLines[i] as InstructionLine | CommandLine;
			if (!line.result)
				continue

			for (let j = 0; j < line.result.length; ++j)
				result[line.baseAddress + j] = line.result[j];
		}
		return result;
	}

}