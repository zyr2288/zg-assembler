import { CompileOption } from "../Base/CompileOption";
import { Config } from "../Base/Config";
import { Enviroment } from "../Base/Enviroment";
import { Command } from "../Command/Command";
import { Include } from "../Command/Include";
import { RepeatCommand } from "../Command/RepeatCommand";
import { CommonLine, LineType } from "../Lines/CommonLine";
import { LabelLine } from "../Lines/LabelLine";
import { MacroLine } from "../Lines/MacroLine";
import { Analyser } from "./Analyser";

export class Compiler {

	static enviroment: Enviroment = new Enviroment();
	static isCompiling = false;
	static stopCompiling = false;

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

	//#region 编译所有行
	/**
	 * 编译所有行
	 * @param option 编译选项
	 */
	static async Compile(option: CompileOption) {
		for (let i = 0; i < option.allLines.length; i++) {
			option.index = i;

			let line: CommonLine | undefined = option.allLines[i];
			if (!line || line.lineType !== LineType.None)
				continue;

			switch (line.key) {
				case "instruction":
					line.Compile(option);
					break;
				case "label":
					line.Compile(option);
					break;
				case "variable":
					line.Compile(option);
					break;
				case "command":
					await Command.Compile(option);
					break;
				case "unknow":
					const result = Analyser.MatchLine(line.org, false, ["macro", Compiler.enviroment.allMacro]);
					if (result.key === "macro") {
						line = MacroLine.Create(result.content!, line.comment);
						await line?.Compile(option);
					} else {
						line = LabelLine.Create(line.org, line.comment);
						line?.Compile(option);
					}

					if (line)
						option.allLines[i] = line;

					break;
				case "macro":
					await line.Compile(option);
					break;
			}

			i = option.index;

			// @ts-ignore
			if (line.lineType === LineType.Error)
				Compiler.stopCompiling = true;

			if (Compiler.stopCompiling) {
				Compiler.enviroment.compileTime = Config.ProjectSetting.compileTimes;
				break;
			}
		}
	}
	//#endregion 编译所有行

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

	static FirstCompile() {
		return Compiler.enviroment.compileTime === 0;
	}
}