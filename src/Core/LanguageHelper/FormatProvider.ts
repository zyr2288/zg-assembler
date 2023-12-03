import { Compiler } from "../Base/Compiler"
import { ExpressionPart } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { MyDiagnostic } from "../Base/MyException"
import { Localization } from "../I18n/Localization";
import { LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";

export class FormatProvide {

	/**
	 * 格式化文档
	 * @param filePath 文件路径
	 */
	static FormatDocument(filePath: string) {

		const fileHash = FileUtils.GetFilePathHashcode(filePath);
		const errors = MyDiagnostic.GetExceptions(fileHash);
		if (errors.length !== 0)
			return Localization.GetMessage("format error");

		const allLines = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!allLines)
			return;

		const result: string[] = [];

		for (let i = 0; i < allLines.length; i++) {
			const line = allLines[i];
			switch (line.type) {
				case LineType.Instruction:
					FormatProvide.FormatInsturction(line as InstructionLine);
					break;
			}
		}

		return result;
	}

	private static FormatInsturction(line: InstructionLine) {
		let result = "";
		if (line.label) {
			if (line.label.token.length >= 6)
				result = line.label.token.text + ":" + "\n\t";
			else
				result = line.label.token.text + ":\t";
		}

		result += line.instruction.text;
		for (let i = 0; i < line.expParts.length; i++) {
			FormatProvide.FormatExpression(line.expParts[i]);
		}
	}


	private static FormatExpression(expPart: ExpressionPart[]) {
		let result = [];

		for (let i = 0; i < expPart.length; i++) {
			const part = expPart[i];
			console.log(part);
		}

		return
	}

}