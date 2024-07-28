import { CompileOption } from "../Base/CompileOption";
import { Config } from "../Base/Config";
import { Enviroment } from "../Base/Enviroment";
import { Include } from "../Command/Include";
import { RepeatCommand } from "../Command/RepeatCommand";
import { LineType } from "../Lines/CommonLine";
import { MacroLine } from "../Lines/MacroLine";

export class Compiler {
	static enviroment: Enviroment = new Enviroment();
	static isCompiling = false;

	private static editEnv = new Enviroment();
	private static compileEnv = new Enviroment();

	static ChangeEnv(env: "edit" | "compile") {
		switch (env) {
			case "edit":
				Compiler.enviroment = Compiler.editEnv;
				break;
			case "compile":
				Compiler.enviroment = Compiler.compileEnv;
				break;
		}
	}

	static AnalyseText(option:CompileOption) {
		
	}

	static GetLinesResult(option: CompileOption, result: number[]) {
		for (let i = 0; i < option.allLines.length; i++) {

			option.index = i;
			const line = option.allLines[i];
			if (!line || line.lineType === LineType.Ignore)
				continue;

			switchLoop:
			switch (line.key) {
				case "macro":
					MacroLine.GetLineResult(option, result);
					break;
				case "command":
					const command = line.command.text.toUpperCase();
					switch (command) {
						case ".INCLUDE":
							Include.GetResult(option, result);
							break switchLoop;
						case ".REPEAT":
							RepeatCommand.GetResult(option, result);
							break switchLoop;
					}
				case "instruction":
					if (line.lineResult.address.org < 0 || line.lineResult.resultLength === 0)
						continue;

					if (line.key === "instruction") {
						const fileIndex = Compiler.enviroment.fileIndex;
						Compiler.enviroment.compileResult.SetLine({
							baseAddress: line.lineResult.address.base,
							fileIndex,
							lineNumber: line.org.line,
							line,
						});
					}

					for (let i = 0; i < line.lineResult.result.length; i++)
						result[line.lineResult.address.base + i] = line.lineResult.result[i];

					break;
			}

			i = option.index;
		}
	}

	static NotLastCompile() {
		return Compiler.enviroment.compileTime < Config.ProjectSetting.compileTimes - 1;
	}
}