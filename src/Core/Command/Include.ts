import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Analyser } from "../Compiler/Analyser";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { ICommand } from "./Command";

export interface IncludeTag {
	orgPath: Token;
	path: string;
	option: CompileOption;
}

/**
 * .INCLUDE 命令
 */
export class Include implements ICommand {

	static GetResult(option: CompileOption, result: number[]) {
		const line = option.GetCurrent<CommandLine>();
		const tag: IncludeTag = line.tag;

		Compiler.GetLinesResult(tag.option, result);
	}

	/***** class *****/

	start = { name: ".INCLUDE", min: 1, max: 1 };

	async AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const result = await IncludeUtils.CheckFile(option);
		if (!result.exsist) {
			line.lineType = LineType.Error;
			return;
		}

		const tag: IncludeTag = { orgPath: line.arguments[0], path: result.path, option: new CompileOption() };
		line.tag = tag;
		
		if (Compiler.enviroment.compileTime < 0)
			return;

		const data = await FileUtils.ReadFile(result.path);
		const text = FileUtils.BytesToString(data);

		const saveFileIndex = Compiler.enviroment.fileIndex;
		Compiler.enviroment.fileIndex = Compiler.enviroment.GetFileIndex(result.path);

		tag.option.allLines = Analyser.AnalyseText(text, result.path);

		await Analyser.AnalyseFirst(tag.option);
		Compiler.enviroment.fileIndex = saveFileIndex;
	}

	async AnalyseSecond(option: CompileOption) {
		if (Compiler.enviroment.compileTime < 0)
			return;

		const line = option.GetCurrent<CommandLine>();
		const tag: IncludeTag = line.tag;

		const saveFileIndex = Compiler.enviroment.fileIndex;
		Compiler.enviroment.fileIndex = Compiler.enviroment.GetFileIndex(tag.path);
		await Analyser.AnalyseSecond(tag.option);
		Compiler.enviroment.fileIndex = saveFileIndex;
	}

	async Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: IncludeTag = line.tag;

		const saveFileIndex = Compiler.enviroment.fileIndex;
		Compiler.enviroment.fileIndex = Compiler.enviroment.GetFileIndex(tag.path);
		await Analyser.Compile(tag.option);
		Compiler.enviroment.fileIndex = saveFileIndex;
	}
}

export interface IncbinTag {
	orgPath: Token;
	path: string;
	exps: Expression[];
}

/**
 * .INCBIN 命令
 */
export class Incbin implements ICommand {
	start = { name: ".INCBIN", min: 1, max: 3 };

	async AnalyseFirst(option: CompileOption) {
		const result = await IncludeUtils.CheckFile(option);
		if (!result.exsist)
			return;

		const line = option.GetCurrent<CommandLine>();
		const tag: IncbinTag = { orgPath: line.arguments[0], path: result.path, exps: [] };
		let temp2;
		if (line.arguments[1] && (temp2 = ExpressionUtils.SplitAndSort(line.arguments[1])))
			tag.exps[0] = temp2;

		if (line.arguments[2] && (temp2 = ExpressionUtils.SplitAndSort(line.arguments[2])))
			tag.exps[1] = temp2;

		line.tag = tag;
	}

	async Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();

		const tag: IncbinTag = line.tag;
		const temp = await FileUtils.ReadFile(tag.path);

		line.lineResult.SetAddress();

		let start = 0;
		if (tag.exps[0]) {
			const result = ExpressionUtils.GetValue(tag.exps[0].parts, { tryValue: false });
			if (result.success)
				start = result.value;
		}

		let length = temp.length;
		if (tag.exps[1]) {
			const result = ExpressionUtils.GetValue(tag.exps[1].parts, { tryValue: false });
			if (result.success)
				length = result.value;
		}

		line.lineResult.result = [];
		for (let i = start, j = 0; i < temp.length && j < length; ++i, ++j)
			line.lineResult.result[j] = temp[i];

		line.lineType = LineType.Finished;
		line.lineResult.AddAddress();
	}
}

class IncludeUtils {

	static async CheckFile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const result = { exsist: false, path: "" };

		line.arguments[0] = line.arguments[0].Trim();
		if (!line.arguments[0].text.startsWith("\"") || !line.arguments[0].text.endsWith("\"")) {
			const error = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(line.arguments[0], error);
			line.lineType = LineType.Error;
			return result;
		}

		const filePath = line.arguments[0].Substring(1, line.arguments[0].length - 2);
		let type = await FileUtils.PathType(filePath.text);
		if (type === "file") {
			result.exsist = true;
			result.path = filePath.text;
		}

		const nowFile = Compiler.enviroment.GetFilePath(Compiler.enviroment.fileIndex);
		const folder = await FileUtils.GetPathFolder(nowFile);
		result.path = FileUtils.Combine(folder, filePath.text);

		type = await FileUtils.PathType(result.path);
		result.exsist = type === "file";
		if (!result.exsist) {
			const errorMsg = Localization.GetMessage("File {0} is not exist", filePath.text);
			MyDiagnostic.PushException(filePath, errorMsg);
		}

		line.tag = { orgPath: filePath, path: result.path } as IncbinTag | IncludeTag;
		return result;
	}
}