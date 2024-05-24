import { Compiler } from "../Base/Compiler";
import { ExpAnalyseOption, ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { ICommonLine, LineCompileType, LineType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

export interface IncbinTag {
	path: string;
	token: Token;
}

interface IncludeTag {
	lines: ICommonLine[];
	fileHash: number;
};

export class Include {

	static Initialize() {

		if (!FileUtils.ReadFile) {
			console.error("File interface not implemented");
			return;
		}

		Commands.AddCommand({
			name: ".INCLUDE", min: 1,
			firstAnalyse: Include.FirstAnalyse_Include,
			secondAnalyse: Include.SecondAnalyse_Include,
			thirdAnalyse: Include.ThirdAnalyse_Include,
			compile: Include.Compile_Include,
		});

		Commands.AddCommand({
			name: ".INCBIN", min: 1, max: 3,
			firstAnalyse: Include.FirstAnalyse_Incbin,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: Include.Compile_Incbin
		});
	}

	/***** Include *****/

	//#region 第一次分析Include
	private static async FirstAnalyse_Include(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();

		let temp = await Include.ChechFile(option);
		if (!temp.exsist) {
			line.compileType = LineCompileType.Error;
			return;
		}

		if (!Compiler.enviroment.isCompileEnv)
			return;

		const hash = Compiler.enviroment.SetFile(temp.path);
		const data = await FileUtils.ReadFile(temp.path);
		const text = FileUtils.BytesToString(data);

		const allLines = Compiler.SplitTexts(hash, text);
		line.tag = { lines: allLines, fileHash: hash } as IncludeTag;

		let tempOption = new DecodeOption(allLines);
		tempOption.macro = option.macro;
		await Compiler.FirstAnalyse(tempOption)
		// option.InsertLines(hash, option.lineIndex + 1, allLines);
	}
	//#endregion 第一次分析Include

	//#region 第二次分析
	private static async SecondAnalyse_Include(option: DecodeOption) {
		if (!Compiler.enviroment.isCompileEnv)
			return;

		const line = option.GetCurrectLine<CommandLine>();
		const tag = line.tag as IncludeTag;
		let tempOption = new DecodeOption(tag.lines);
		tempOption.macro = option.macro;

		await Compiler.SecondAnalyse(tempOption);
	}
	//#endregion 第二次分析

	//#region 第三次分析
	private static async ThirdAnalyse_Include(option: DecodeOption) {
		if (!Compiler.enviroment.isCompileEnv)
			return;

		const line = option.GetCurrectLine<CommandLine>();
		const tag = line.tag as IncludeTag;
		let tempOption = new DecodeOption(tag.lines);
		tempOption.macro = option.macro;

		await Compiler.ThirdAnalyse(tempOption);
	}
	//#endregion 第三次分析

	private static async Compile_Include(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const tag = line.tag as IncludeTag;
		let tempOption = new DecodeOption(tag.lines);
		tempOption.macro = option.macro;

		option.InsertLines(tag.fileHash, option.lineIndex + 1, tag.lines);
		// await Compiler.CompileResult(tempOption);
	}

	/***** Incbin *****/

	//#region 第一次分析Incbin
	private static async FirstAnalyse_Incbin(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const expressions: Token[] = line.tag;

		const temp = await Include.ChechFile(option);
		if (!temp.exsist) {
			line.compileType = LineCompileType.Error;
			return;
		}

		let temp2;
		if (expressions[1] && (temp2 = ExpressionUtils.SplitAndSort(expressions[1])))
			line.expression[0] = temp2;

		if (expressions[2] && (temp2 = ExpressionUtils.SplitAndSort(expressions[2])))
			line.expression[1] = temp2;

	}
	//#endregion 第一次分析Incbin

	//#region 编译Incbin
	private static async Compile_Incbin(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const tag = line.tag as IncbinTag;
		const temp = await FileUtils.ReadFile(tag.path);

		if (Commands.SetOrgAddressAndLabel(option))
			return;

		let start = 0;

		const analyseOption: ExpAnalyseOption = { analyseType: "GetAndShowError" };
		if (line.expression[0]) {
			let result = ExpressionUtils.GetExpressionValue<number>(line.expression[0], option, analyseOption);
			if (result.success)
				start = result.value;
		}

		let length = temp.length;
		if (line.expression[1]) {
			let result = ExpressionUtils.GetExpressionValue<number>(line.expression[1], option, analyseOption);
			if (result.success)
				length = result.value;
		}

		line.result = [];
		for (let i = start, j = 0; i < temp.length && j < length; ++i, ++j)
			line.result[j] = temp[i];
		
		line.compileType = LineCompileType.Finished;
		line.AddAddress();
	}
	//#endregion 编译Incbin

	/***** 辅助函数 *****/

	/**检查是否满足表达式 */
	private static CheckString(text: string) {
		return /^"[^\"]*"$/.test(text)
	}

	//#region 检查文件是否存在
	/**
	 * 检查文件是否存在，会修改 line.tag
	 * @param option 编译选项
	 * @returns 
	 */
	private static async ChechFile(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const expressions: Token[] = line.tag;
		const result = { exsist: false, path: "" };

		if (!Include.CheckString(expressions[0].text)) {
			let errorMsg = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(expressions[0], errorMsg);
			line.compileType = LineCompileType.Error;
			return result;
		}

		const token = expressions[0].Substring(1, expressions[0].length - 2);
		let type = await FileUtils.PathType(token.text);
		if (type === "file") {
			result.exsist = true;
			result.path = token.text;
		}

		const file = Compiler.enviroment.GetFile(token.fileHash);
		const folder = await FileUtils.GetPathFolder(file);
		result.path = FileUtils.Combine(folder, token.text);

		type = (await FileUtils.PathType(result.path));
		result.exsist = type === "file";
		if (!result.exsist) {
			const errorMsg = Localization.GetMessage("File {0} is not exist", token.text);
			MyDiagnostic.PushException(token, errorMsg);
		}

		line.tag = { token, path: result.path };
		return result;
	}
	//#endregion 检查文件是否存在

}