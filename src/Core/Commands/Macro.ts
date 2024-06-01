import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpAnalyseOption, ExpressionUtils, PriorityType, Expression } from "../Base/ExpressionUtils";
import { LabelCommon, LabelNormal, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption, IncludeLine } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { CommonLine, HighlightToken, ICommonLine, LineCompileType, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { MacroLine } from "../Lines/MacroLine";
import { OnlyLabelLine } from "../Lines/OnlyLabelLine";
import { VariableLine } from "../Lines/VariableLine";
import { Platform } from "../Platform/Platform";
import { Commands } from "./Commands";

type LineTag = Macro;

/**自定义函数，非编译行 */
export class Macro {

	/**自定义函数名称 */
	name!: Token;

	/**自定义函数所有参数 */
	params = new Map<string, { label: LabelNormal, values: number[], stringLength: number }>();

	/**函数内所有的标签 */
	labels = new Map<string, LabelNormal>();

	/**函数的不定参数 */
	indefiniteParam?: Token;

	indefiniParamValues?: Map<string, number>;

	/**自定义函数所有行 */
	lines: CommonLine[] = [];

	/**函数注释 */
	comment?: string;

}

export class MacroUtils {

	//#region 匹配一行自定义函数
	/**
	 * 匹配一行自定义函数
	 * @param labelToken 标签
	 * @param macroToken 自定义函数名称
	 * @param expression 所有参数
	 * @param option 编译选项
	 * @returns 
	 */
	static MatchMacroLine(macroToken: Token, expression: Token, option: DecodeOption) {
		const macro = Compiler.enviroment.allMacro.get(macroToken.text)!;
		const macroLine = new MacroLine();

		macroLine.orgText = option.GetCurrectLine().orgText;
		macroLine.macro = macro;
		macroLine.macroToken = macroToken;

		option.ReplaceLine(macroLine, macroToken.fileHash);

		let parts: Token[] = [];
		if (!expression.isEmpty)
			parts = Utils.SplitWithComma(expression);

		if (parts.length !== macro.params.size) {
			const errorMsg = Localization.GetMessage("Macro arguments count is {0}, but got {1}", macro.params.size, parts.length);
			MyDiagnostic.PushException(macroToken, errorMsg);
			return;
		}

		let temp: Expression | undefined;
		for (let i = 0; i < parts.length; ++i) {
			const part = parts[i];
			if (part.isEmpty) {
				const error = Localization.GetMessage("Macro arguments error");
				MyDiagnostic.PushException(part, error);
				continue;
			}

			if (temp = ExpressionUtils.SplitAndSort(part))
				macroLine.expression[i] = temp;
		}

	}
	//#endregion 匹配一行自定义函数

	//#region 创建一个自定义函数
	/**
	 * 创建一个自定义函数
	 * @param name 名称
	 * @param params 参数
	 * @returns 创建成功返回macro
	 */
	static CreateMacro(name: Token, params: Token[]) {
		if (!LabelUtils.CheckIllegal(name.text, false))
			return;

		const tempMatch = Compiler.MatchLineCommon(name.text);
		if (tempMatch.key !== "unknow") {
			const errorMsg = Localization.GetMessage("Label {0} illegal", name.text);
			MyDiagnostic.PushException(name, errorMsg);
			return;
		}

		if (Compiler.enviroment.allLabel.global.has(name.text) || Compiler.enviroment.allMacro.has(name.text)) {
			const errorMsg = Localization.GetMessage("Label {0} is already defined", name.text);
			MyDiagnostic.PushException(name, errorMsg);
			return;
		}

		const macro = new Macro();
		macro.name = name;

		// Macro 参数不为零
		if (params.length !== 0) {
			for (let i = 0; i < params.length; ++i) {
				const part = params[i];
				const label = LabelNormal.Create(part, { labelType: LabelType.Parameter });

				if (i === params.length - 1 && part.text.startsWith("...")) {
					macro.indefiniteParam = part.Substring(3);

					if (!LabelUtils.CheckIllegal(label.token.text, false)) {
						const errorMsg = Localization.GetMessage("Label {0} illegal", part.text);
						MyDiagnostic.PushException(part, errorMsg);
						continue;
					}

					if (macro.params.has(part.text)) {
						const errorMsg = Localization.GetMessage("Label {0} is already defined", part.text);
						MyDiagnostic.PushException(part, errorMsg);
						continue;
					}
				} else {
					macro.params.set(label.token.text, { label, values: [], stringLength: 0 });
				}

			}

			Compiler.enviroment.allMacro.set(name.text, macro);
			let allSet = Compiler.enviroment.fileMacros.get(name.fileHash);
			if (!allSet) {
				allSet = new Set();
				Compiler.enviroment.fileMacros.set(name.fileHash, allSet);
			}
			allSet.add(name.text);
		}

		return macro;
	}
	//#endregion 创建一个自定义函数

	//#region 编译自定义函数
	/**
	 * 编译自定义函数
	 * @param option 编译选项
	 */
	static async CompileMacroLine(option: DecodeOption) {
		const line = option.GetCurrectLine<MacroLine>();
		if (Compiler.compileTimes === 0)
			line.macro = Utils.DeepClone(line.macro);

		const macro = line.macro;

		const keys = macro.params.keys();
		let index = 0;

		for (const key of keys) {
			const result = ExpressionUtils.GetStringValue(line.expression[index], option);
			const param = macro.params.get(key)!;

			param.stringLength = result.values.length;
			if (result.success)
				param.values = result.values;

			index++;
		}

		const tempOption = new DecodeOption(macro.lines);
		tempOption.macro = macro;
		MacroUtils.ReplaceContent(tempOption.allLines, macro);
		await Compiler.CompileResult(tempOption);
		option.InsertLines(line.macroToken.fileHash, option.lineIndex + 1, macro.lines);

		line.compileType = LineCompileType.Finished;
	}
	//#endregion 编译自定义函数

	//#region 填充编译结果值
	/**
	 * 填充编译结果值
	 * @param data 编译结果数据
	 * @param line 自定义函数行
	 */
	static FillResultBytes(data: Int16Array, line: MacroLine) {
		const allLines = line.macro.lines;
		for (let i = 0; i < allLines.length; ++i) {
			const line = allLines[i] as InstructionLine | CommandLine;
			if (!line.result)
				continue;

			for (let j = 0; j < line.result.length; ++j)
				data[line.baseAddress + j] = line.result[j];
		}
	}
	//#endregion 填充编译结果值

	/***** private *****/

	private static ReplaceContent(lines: CommonLine[], macro: Macro) {
		if (!macro)
			return;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			switch (line.type) {
				case LineType.Instruction:
				case LineType.Command:
					const insLine = line as InstructionLine | CommandLine;
					MacroUtils._ReplaceExpression(insLine.expression, macro);
					break;
				case LineType.Variable:
					const varLine = line as VariableLine;
					if (!varLine.saveLabel)
						break;

					const tempToken = varLine.saveLabel.label.token;
					let label: LabelCommon | undefined = undefined;
					if (tempToken.text.startsWith(".")) {
						label = macro.labels.get(tempToken.text);
					} else {
						label = LabelUtils.FindLabel(tempToken);
					}
					if (label !== undefined)
						varLine.saveLabel.label = label;

					break;
				case LineType.OnlyLabel:
					const olLine = line as OnlyLabelLine;
					if (!olLine.saveLabel)
						break;

					const olTempLabel = macro.labels.get(olLine.saveLabel.label.token.text);
					if (!olTempLabel)
						break;

					olLine.saveLabel.label = olTempLabel;
					break;
			}
		}

	}

	private static _ReplaceExpression(exps: Expression[], macro: Macro) {
		for (let i = 0; i < exps.length; i++) {
			for (let j = 0; j < exps[i].parts.length; j++) {
				const exp = exps[i].parts[j];
				switch (exp.type) {
					case PriorityType.Level_1_Label:
						const param1 = macro.params.get(exp.token.text);
						if (!param1)
							continue;

						if (param1.stringLength > 1) {
							exp.type = PriorityType.Level_3_CharArray;
							exp.chars = param1.values;
							exp.chars.length = param1.stringLength;
						}
						break;
					// case PriorityType.Level_3_CharArray:
					// 	const param2 = macro.params.get(exp.token.text);
					// 	if (!param2 || param2.values === undefined)
					// 		continue;

					// 	exp.chars = param2.values;
				}
			}
		}
	}

}

/**Macro命令分析 */
export class MacroCommand {

	static Initialize() {
		Commands.AddCommand({
			name: ".MACRO", end: ".ENDM", min: 1, max: -1,
			nested: false, label: false, ableMacro: false,
			firstAnalyse: MacroCommand.FirstAnalyse,
			secondAnalyse: MacroCommand.SecondAnalyse_Macro,
			thirdAnalyse: MacroCommand.ThirdAnalyse,
		});
	}

	//#region 第一次分析Macro
	/**
	 * 第一次分析Macro
	 * @param option 编译选项
	 * @param include 包含的行
	 * @returns 
	 */
	private static async FirstAnalyse(option: DecodeOption, include?: IncludeLine[]) {
		const line = option.GetCurrectLine<CommandLine>();
		const expressions: Token[] = line.tag;
		const name = expressions[0];
		expressions.splice(0, 1);

		const macro = MacroUtils.CreateMacro(name, expressions);
		if (!macro) {
			line.compileType = LineCompileType.Error;
			return;
		}

		line.GetTokens = MacroCommand.GetToken.bind(line);

		macro.comment = line.comment;
		macro.lines = Commands.CollectBaseLines(option, include!);

		Compiler.enviroment.SetRange(line.command.fileHash, {
			type: "Macro",
			key: macro.name.text,
			startLine: include![0].line,
			endLine: include![1].line,
		});

		line.tag = macro;

		const tempOption = new DecodeOption(macro.lines);
		tempOption.macro = macro;
		await Compiler.FirstAnalyse(tempOption);
	}
	//#endregion 第一次分析Macro

	//#region 第二次分析
	private static async SecondAnalyse_Macro(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const macro = line.tag as LineTag;
		const tempOption = new DecodeOption(macro.lines);
		tempOption.macro = macro;
		await Compiler.SecondAnalyse(tempOption);
	}
	//#endregion 第二次分析

	//#region 第三次分析
	private static async ThirdAnalyse(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const macro = line.tag as LineTag;
		const tempOption = new DecodeOption(macro.lines);
		tempOption.macro = macro;
		await Compiler.ThirdAnalyse(tempOption);
	}
	//#endregion 第三次分析

	//#region 获取 Macro 命令行内所有 Line 的高亮 Token
	private static GetToken(this: CommandLine) {
		const macro = this.tag as LineTag;
		const result: HighlightToken[] = [];

		for (let i = 0; i < macro.lines.length; ++i) {
			// @ts-ignore
			const tokens = macro.lines[i].GetTokens?.();
			if (tokens)
				result.push(...tokens);
		}
		return result;
	}
	//#endregion 获取 Macro 命令行内所有 Line 的高亮 Token

}