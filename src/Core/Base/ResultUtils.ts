import { ICommandLine } from "../Commands/Commands";
import { ICommonLine } from "../Lines/CommonLine";
import { IInstructionLine } from "../Lines/InstructionLine";

export class ResultUtils {

	/**获取所有行的结果 */
	static GetResult(allLines: ICommonLine[]) {
		let result: number[] = [];
		for (let i = 0; i < allLines.length; ++i) {
			const line = allLines[i] as IInstructionLine | ICommandLine;
			if (!line.result)
				continue

			for (let j = 0; j < line.result.length; ++j)
				result[line.baseAddress + j] = line.result[j];
		}
		return result;
	}

}