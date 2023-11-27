import { MacroUtils } from "../Commands/Macro";
import { CommandLine } from "../Lines/CommandLine";
import { ICommonLine, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { Compiler } from "./Compiler";

export class ResultUtils {

	//#region 获取所有行的结果
	/**
	 * 获取所有行的结果
	 * @param allLines 所有编译行
	 * @returns 
	 */
	static GetResult(allLines: ICommonLine[]) {
		if (Compiler.enviroment.fileRange.end < 0)
			return;

		const result: Int16Array = new Int16Array(Compiler.enviroment.fileRange.end);
		result.fill(-1);
		for (let i = 0; i < allLines.length; ++i) {
			const line = allLines[i] as InstructionLine | CommandLine | MacroLine;
			if (line.type === LineType.Macro) {
				MacroUtils.FillResultBytes(result, line as MacroLine);
				continue;
			}

			if (!line.result)
				continue;

			for (let j = 0; j < line.result.length; ++j)
				result[line.baseAddress + j] = line.result[j];
		}
		return result;
	}
	//#endregion 获取所有行的结果

}