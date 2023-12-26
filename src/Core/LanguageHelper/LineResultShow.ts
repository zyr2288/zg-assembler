import { Compiler } from "../Base/Compiler";
import { FileUtils } from "../Base/FileUtils";
import { Localization } from "../I18n/Localization";
import { InstructionLine } from "../Lines/InstructionLine";

export class LineResultShow {

	static GetLineResult(file: string, lineNumber: number) {
		if (!Compiler.enviroment.isCompileEnv)
			return;

		const fileHash = FileUtils.GetFilePathHashcode(file);
		const allLine = Compiler.enviroment.allBaseLines.get(fileHash);
		if (!allLine)
			return;

		for (let i = 0; i < allLine.length; i++) {
			const line = allLine[i] as InstructionLine;
			if (line.orgText.line !== lineNumber)
				continue;

			const result: number[] = line.result;
			if (!result || result.length === 0)
				continue;

			const base = "$" + line.baseAddress.toString(16).toUpperCase();
			const org = "$" + line.orgAddress.toString(16).toUpperCase();
			let resultStr = "";
			for (let j = 0; j < result.length; j++)
				resultStr += result[j].toString(16).padStart(2, "0").toUpperCase() + " ";

			const message = Localization.GetMessage("baseOrgResult", base, org, resultStr);
			return message;
		}
	}
}