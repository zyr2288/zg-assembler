import { Environment } from "./Environment";
import { LineUtils } from "../Lines/LineUtils";
import { DecodeOption } from "./Options";
import { Instruction } from "../Lines/Instruction";
import { LineType } from "../Lines/CommonLine";
import { Commands } from "../Commands/Commands";

export class Compiler {

	private static compilerEnv = new Environment();
	private static editorEnv = new Environment();

	static enviroment: Environment;

	//#region 解析文本
	static async DecodeText(files: { text: string, filePath: string }[]) {

		Compiler.enviroment = Compiler.editorEnv;

		let option: DecodeOption = { allLines: [], lineIndex: 0, fileHash: 1 };
		for (let index = 0; index < files.length; ++index) {
			option.fileHash = Compiler.enviroment.SetFile(files[index].filePath);
			Compiler.enviroment.ClearFileRange(option.fileHash);
			
			option.allLines.push(...LineUtils.SplitTexts(files[index].text));
		}

		await Compiler.FirstAnalyse(option);

	}
	//#endregion 解析文本

	//#region 第一次分析
	/**第一次分析 */
	static async FirstAnalyse(option: DecodeOption) {

		for (let i = 0; i < option.allLines.length; ++i) {
			const line = option.allLines[i];

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Instruction:
					Instruction.FirstAnalyse(option);
					break;
				case LineType.Command:
					Commands.FirstAnalyse(option);
					break;
				case LineType.Variable:
					break;
				case LineType.Unknow:
					break;
			}
		}

	}
	//#endregion 第一次分析

}