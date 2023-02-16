import { Environment } from "./Environment";
import { LineUtils } from "../Lines/LineUtils";
import { DecodeOption } from "./Options";
import { Instruction } from "../Lines/Instruction";
import { LineType } from "../Lines/CommonLine";
import { Commands } from "../Commands/Commands";
import { MacroUtils } from "./Macro";
import { LabelType, LabelUtils } from "./Label";

export class Compiler {

	private static compilerEnv = new Environment();
	private static editorEnv = new Environment();

	static enviroment: Environment;

	//#region 解析文本
	static async DecodeText(files: { text: string, filePath: string }[]) {

		Compiler.enviroment = Compiler.editorEnv;

		let option: DecodeOption = { allLines: [], lineIndex: 0, };
		for (let index = 0; index < files.length; ++index) {
			let fileHash = Compiler.enviroment.SetFile(files[index].filePath);
			Compiler.enviroment.ClearFileRange(fileHash);
			LineUtils.SplitTexts(files[index].text, option);
		}

		await Compiler.FirstAnalyse(option);

		await Compiler.ThirdAnalyse(option);
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

			i = option.lineIndex;
		}

	}
	//#endregion 第一次分析

	//#region 第二次分析
	static async SecondAnalyse(option: DecodeOption) {
		for (let i = 0; i < option.allLines.length; i++) {
			let line = option.allLines[i];

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Unknow:
					let match = new RegExp(Compiler.enviroment.macroRegexString).exec(line.orgText.text);
					let macroName = match?.groups?.["macro"];
					if (macroName) {
						let pre = line.orgText.Substring(0, match!.index);
						let currect = line.orgText.Substring(match!.index, match![0].length);
						let after = line.orgText.Substring(match!.index + match![0].length);
						MacroUtils.CreateLine(pre, currect, after, option);

					} else {
						option.allLines[i].type = LineType.OnlyLabel;
						let label = LabelUtils.CreateLabel(option.allLines[i].orgText, option);
						if (label)
						 label.labelType = LabelType.Label;
					}
					break;
				case LineType.Command:
					await Commands.SecondAnalyse(option);
					break;
			}
			i = option.lineIndex;
		}
	}
	//#endregion 第二次分析

	//#region 第三次分析
	static async ThirdAnalyse(option: DecodeOption) {
		for (let i = 0; i < option.allLines.length; ++i) {
			const line = option.allLines[i];

			option.lineIndex = i;
			switch (line.type) {
				case LineType.Instruction:
					Instruction.ThirdAnalyse(option);
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
	//#endregion 第三次分析

}