import { BaseLine, BaseLineFinishType, BaseLineType } from "./BaseLine";
import { BaseOption, CompileOption } from "./CompileOption";
import { Instructions } from "./Instructions";
import { LebalUtils } from "../Utils/LebalUtils";
import { GlobalVar } from "./GlobalVar";
import { Label, LabelDefinedState, LabelState } from "./Label";
import { Macro } from "./Macro";
import { ErrorLevel, ErrorType, MyException } from "./MyException";
import { Commands } from "./Commands";
import { LexerUtils } from "../Utils/LexerUtils";
import { Config } from "./Config";
import { MacroUtils } from "../Utils/MacroUtils";

export class Compile {

	//#region 编译所有文本
	/**
	 * 编译所有文本
	 * @param text 文本
	 * @param filePath 文件路径
	 * @returns 基础行的基础分割
	 */
	static async CompileText(text: string, filePath: string) {

		GlobalVar.SwitchEnvironment("Compile");
		GlobalVar.isCompiling = true;

		GlobalVar.env.isCompile = true;

		GlobalVar.env.ClearAll();
		MyException.ClearAll();

		let hash = GlobalVar.env.SetFile(filePath);
		let allBaseLine = Compile.GetAllBaseLine(text, hash);

		let noError = await Compile.LebalAndMacroAnalyse(allBaseLine);
		if (!noError)
			return;

		await Compile.AnalyseMacro(allBaseLine);

		GlobalVar.env.compileCount = Config.ProjectSetting.compileTimes;
		await Compile.AnalyseLebal(allBaseLine);

		GlobalVar.env.compileCount = 0;
		if (!MyException.isError) {
			while (GlobalVar.env.compileCount < Config.ProjectSetting.compileTimes) {
				await Compile.CompileAndGetResult(allBaseLine);
				GlobalVar.env.compileCount++;
			}
		}

		let result: number[] = [];
		if (!MyException.isError)
			result = Compile.GetAllBaseLineResult(allBaseLine);

		GlobalVar.isCompiling = false;
		return result;
	}
	//#endregion 编译所有文本

	//#region 解析文本
	/**
	 * 解析文本
	 * @param files {text:文本, filePath:文件路径}
	 * @returns 
	 */
	static async DecodeText(files: { text: string, filePath: string }[]) {
		GlobalVar.SwitchEnvironment("Editor");
		GlobalVar.isCompiling = true;
		let allBaseLine: BaseLine[] = [];
		for (let i = 0; i < files.length; i++) {
			let hash = GlobalVar.env.SetFile(files[i].filePath);
			LebalUtils.DeleteLebal(hash);
			MacroUtils.DeleteMacro(hash);
			MyException.ClearFileError(hash);

			let tempLines = Compile.GetAllBaseLine(files[i].text, hash);

			await Compile.LebalAndMacroAnalyse(tempLines);
			await Compile.AnalyseMacro(tempLines);

			tempLines.forEach(value => allBaseLine.push(value));
		}

		await Compile.AnalyseLebal(allBaseLine);
		GlobalVar.isCompiling = false;
	}
	//#endregion 解析文本

	/***** 辅助方法 *****/

	//#region 获取基础行
	/**
	 * 获取基础行
	 * @param text 文本
	 * @param fileHash 文件Hash值
	 * @returns 所有解析的基础行
	 */
	static GetAllBaseLine(text: string, fileHash: number) {
		let lines = text.split(/\r?\n/g);
		let baseLines: BaseLine[] = [];
		lines.forEach((value, index) => {
			let temp = BaseLine.SplitBaseLine(value, fileHash, index);
			if (temp)
				baseLines.push(temp);
		});

		return baseLines;
	}
	//#endregion 获取基础行

	//#region 第一阶段，基础分析标签与定义的自定义函数
	/**
	 * 第一阶段，基础分析标签与定义的自定义函数
	 * @param baseLines 所有基础行
	 * @param option 选项
	 * @returns 是否继续，false为有误
	 */
	static async LebalAndMacroAnalyse(baseLines: BaseLine[], option?: BaseOption) {
		let op: CompileOption = { allBaseLine: baseLines, baseLineIndex: 0, currectLine: baseLines[0], macro: option?.macro };
		for (let i = 0; i < baseLines.length; i++) {
			op.baseLineIndex = i;
			op.currectLine = baseLines[i];

			switch (op.currectLine.lineType) {
				case BaseLineType.Command:
					await Commands.BaseAnalyse(op);
					break;
				case BaseLineType.Expression:
					let lebal = LebalUtils.CreateLebal(op.currectLine.lebalWord);
					if (lebal) {
						lebal.labelDefined = LabelDefinedState.Variable;
					}
					break;
				case BaseLineType.Ignore:
					continue;
			}

			if (op.currectLine.finishType == BaseLineFinishType.ErrorAndBreak)
				return false;

			i = op.baseLineIndex;
		}
		return true;
	}
	//#endregion 第一阶段，基础分析标签与定义的自定义函数

	//#region 第二阶段，分析自定义函数之前的标签
	/**
	 * 第二阶段，分析自定义函数之前的标签
	 * @param allBaseLine 所有编译行
	 * @param option 选项
	 */
	static async AnalyseMacro(allBaseLine: BaseLine[], option?: BaseOption) {
		let compileOption: CompileOption = { allBaseLine: allBaseLine, baseLineIndex: 0, currectLine: allBaseLine[0], macro: option?.macro };
		for (let i = 0; i < allBaseLine.length; i++) {
			const line = allBaseLine[i];
			compileOption.currectLine = line;

			const { word, comment } = BaseLine.GetComment(line.originalString);
			switch (line.lineType) {
				case BaseLineType.Instruction:
					if (!line.lebalWord?.isNull) {
						LebalUtils.CreateLebal(line.lebalWord, undefined, comment, compileOption);
					}
					break;
				case BaseLineType.Command:
					if (line.lebalWord) {
						LebalUtils.CreateLebal(line.lebalWord, undefined, comment, compileOption);
					}
					await Commands.AnalyseMacro(compileOption)
					break;
				case BaseLineType.Unknow:
					let match = MacroUtils.RegexMatch(word.text);
					if (match) {
						let lebalWord = word.Substring(0, match.index);
						if (!lebalWord.isNull) {
							let lebal = LebalUtils.CreateLebal(lebalWord, undefined, comment, option);
							lebal!.labelDefined = LabelDefinedState.Defined;
							line.lebalWord = lebalWord;
						}

						line.lineType = BaseLineType.Macro;
						line.keyword = word.Substring(match.index, match[0].length);
						line.expression = word.Substring(match.index + match[0].length);
					} else {
						line.lineType = BaseLineType.OnlyLebal;
						line.lebalWord = word;
						let lebal = LebalUtils.CreateLebal(word, undefined, comment, option);
						if (lebal)
							lebal.labelDefined = LabelDefinedState.Defined;
					}
					break;
				case BaseLineType.OnlyLebal:
					let lebal = LebalUtils.CreateLebal(line.lebalWord, undefined, comment);
					if (lebal)
						lebal.labelDefined = LabelDefinedState.Defined;

					break;
				case BaseLineType.Ignore:
					continue;
			}
		}
	}
	//#endregion 第二阶段，分析自定义函数之前的标签

	//#region 第三阶段，获取标签后的分析
	/**第三阶段，获取标签后的分析 */
	static async AnalyseLebal(allBaseLine: BaseLine[], option?: BaseOption) {
		let compileOption: CompileOption = { allBaseLine: allBaseLine, baseLineIndex: 0, currectLine: allBaseLine[0], macro: option?.macro };
		for (let i = 0; i < allBaseLine.length; i++) {
			compileOption.currectLine = allBaseLine[i];

			if (compileOption.currectLine.finishType == BaseLineFinishType.ErrorLine)
				continue;

			compileOption.baseLineIndex = i;
			switch (compileOption.currectLine.lineType) {
				case BaseLineType.Command:
					await Commands.AnalyseLebal(compileOption);
					break;
				case BaseLineType.Instruction:
					Instructions.platform.InstructionLineBaseAnalyse(compileOption.currectLine);
					break;
				case BaseLineType.Expression:
					if (compileOption.currectLine.expression.isNull) {
						MyException.PushException(compileOption.currectLine.expression, ErrorType.ExpressionError, ErrorLevel.Show);
					} else {
						const { comment } = BaseLine.GetComment(compileOption.currectLine.originalString);
						let temp = LexerUtils.GetExpressionValue(compileOption.currectLine.expression, "tryValue");
						let lebal = LebalUtils.FindLebal(compileOption.currectLine.lebalWord!, option);
						lebal!.comment = comment;
						if (temp.success)
							lebal!.value = temp.value;
					}
					break;
				case BaseLineType.Macro:
					await MacroUtils.AnalyseMacro(compileOption.currectLine);
					break;
				case BaseLineType.Ignore:
					continue;
			}
		}
	}
	//#endregion 第三阶段，获取标签后的分析

	//#region 解析所有行获取结果
	static async CompileAndGetResult(allBaseLine: BaseLine[], option?: BaseOption) {
		let compileOption: CompileOption = { allBaseLine, baseLineIndex: 0, currectLine: allBaseLine[0], macro: option?.macro };
		for (let i = 0; i < allBaseLine.length; i++) {
			if (MyException.isError)
				break;

			const line = allBaseLine[i];
			if (line.finishType == BaseLineFinishType.Finished || line.lineType == BaseLineType.Ignore)
				continue;

			compileOption.baseLineIndex = i;
			compileOption.currectLine = allBaseLine[i];
			let lebal: Label | undefined;
			if (line.lineType != BaseLineType.Expression && line.lebalWord) {
				if (lebal = LebalUtils.FindTemporaryLebal(line.lebalWord)) {
					let temp = lebal.lineNumbers.find(value => value.lineNumber == line.lebalWord!.lineNumber);
					temp!.value = GlobalVar.env.originalAddress;
				} else if (lebal = LebalUtils.FindLebal(line.lebalWord)) {
					lebal.value = GlobalVar.env.originalAddress;
				}
			}

			switch (line.lineType) {
				case BaseLineType.Instruction:
					Instructions.platform.InstructionAnalyse(line);
					break;
				case BaseLineType.Command:
					await Commands.AnalyseCommand(compileOption);
					break;
				case BaseLineType.OnlyLebal:
					line.finishType = BaseLineFinishType.Finished;
					break;
				case BaseLineType.Expression:
					let result = LexerUtils.GetExpressionValue(line.expression, "getValue");
					if (result.success) {
						let lebal = LebalUtils.FindLebal(line.lebalWord!);
						lebal!.value = result.value;
						line.finishType = BaseLineFinishType.Finished;
					}
					break;
				case BaseLineType.Macro:
					Commands.Command_Macro(compileOption);
					break;
			}

			i = compileOption.baseLineIndex;
		}
	}
	//#endregion 解析所有行获取结果

	//#region 所有解析后的行获取值
	static GetAllBaseLineResult(allBaseLine: BaseLine[]): number[] {
		let result: number[] = [];
		for (let i = 0; i < allBaseLine.length; i++) {
			const line = allBaseLine[i];
			if (line.finishType) {
				line.result.forEach((value, index) => {
					result[line.baseAddress + index] = value;
				});
			}
		}
		return result;
	}
	//#endregion 所有解析后的行获取值

	//#region 获取所有基础行的Buffer
	static GetAllBaseLineBytes(data: number[]): Uint8Array {
		let buffer = new Uint8Array(data.length);
		for (let i = 0; i < data.length; i++) {
			if (data[i] != undefined)
				buffer[i] = data[i];
		}
		return buffer;
	}
	//#endregion 获取所有基础行的Buffer

	//#region 获取编译的String
	static GetResultString(data: number[]) {
		let result = "";
		for (let i = 0; i < data.length; i++) {
			const d = data[i];
			if (d == undefined) {
				result += "00 ";
			} else {
				let temp = d.toString(16);
				temp = temp.toUpperCase();
				if (temp.length < 2)
					temp = "0" + temp;

				result += temp + " ";
			}
		}
		return result;
	}
	//#endregion 获取编译的String

}