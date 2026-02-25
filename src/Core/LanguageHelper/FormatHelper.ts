import { Compiler } from "../Compiler/Compiler";

export class FormatHelper {

	static Format(filePath: string, options: { insertSpaces: boolean, tabSize: number }) {
		const lines: string[] = [];

		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		const allLine = Compiler.enviroment.allLine.get(fileIndex);
		if (!allLine)
			return;

		
		for (let i = 0; i < allLine.length; i++) {
			const line = allLine[i];
			if (!line) {
				lines.push("");
				continue;
			}

			switch (line.key) {
				case "instruction":
					break;
				case "command":
					break;
				case "macro":
					break;
				case "variable":
					break;
				case "label":
					break;
				case "unknow":
					break;
			}
		}

		return lines;
	}
}