import { Environment } from "./Environment";
import { LineUtils } from "../Lines/LineUtils";
import { DecodeOption } from "./Options";
import { InstructinLineUtils } from "../Lines/InstructionLine";
import { LineType } from "../Lines/CommonLine";

export class Compiler {

	private static compilerEnv = new Environment();
	private static editorEnv = new Environment();

	static enviroment: Environment;

	static async DecodeText(files: { text: string, filePath: string }[]) {

		Compiler.enviroment = Compiler.editorEnv;

		let lines;
		for (let index = 0; index < files.length; ++index) {
			lines = LineUtils.ParseTexts(files[index].text);

		}
	}

	static async FirstAnalyse(option: DecodeOption) {

		for (let i = 0; i < option.allLines.length; ++i) {
			const line = option.allLines[i];

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Instruction:
					InstructinLineUtils.FirstAnalyse(option);
					break;
				case LineType.Command:
					break;
				case LineType.Variable:
					break;
				case LineType.Unknow:
					break;
			}
		}

	}

}