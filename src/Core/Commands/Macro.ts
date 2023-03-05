import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "../Lines/CommonLine";
import { Platform } from "../Platform/Platform";
import { Commands, ICommandLine } from "./Commands";

export interface IMacroLine extends ICommonLine {
	label?: ILabel;
	macro: IMacro;
	args: ExpressionPart[][];
	expression: Token;
}

export class IMacro {
	name!: Token;
	params: ILabel[] = [];
	paramsHashs = new Set<number>();
	labels = new Map<number, ILabel>();
	lines: ICommonLine[] = [];
	comment?: string;

	GetCopy() {
		return Utils.DeepClone<IMacro>(this);
	}
}

export class MacroUtils {

	//#region 匹配一行自定义函数
	/**匹配一行自定义函数 */
	static MatchMacroLine(labelToken: Token, macroToken: Token, expression: Token, option: DecodeOption) {
		if (!labelToken.isEmpty)
			LabelUtils.CreateLabel(labelToken, option);

		let macro = Compiler.enviroment.allMacro.get(macroToken.text)!;
		let macroLine = {
			macro: macro,
			args: [],
			expression: expression,
			type: LineType.Macro,
			orgText: option.allLines[option.lineIndex].orgText,
			compileType: LineCompileType.None
		} as IMacroLine;
		option.allLines[option.lineIndex] = macroLine;

		let parts: Token[] = [];
		if (!expression.isEmpty) {
			parts = expression.Split(/\,/g);
		}

		if (parts.length != macro.params.length) {
			let errorMsg = Localization.GetMessage("Macro arguments error");
			MyDiagnostic.PushException(macroToken, errorMsg);
			return;
		}

		let temp: ExpressionPart[] | undefined;
		for (let i = 0; i < parts.length; ++i) {
			if (temp = ExpressionUtils.SplitAndSort(parts[i]))
				macroLine.args[i] = temp;
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
		if (!LabelUtils.CheckIllegal(name, false))
			return;

		if (new RegExp(Platform.regexString, "ig").test(name.text)) {
			let errorMsg = Localization.GetMessage("Label {0} illegal", name.text);
			MyDiagnostic.PushException(name, errorMsg);
			return;
		}

		let hash = Utils.GetHashcode(name.text);
		if (Compiler.enviroment.allLabel.has(hash) || Compiler.enviroment.allMacro.has(name.text)) {
			let errorMsg = Localization.GetMessage("Label {0} is already defined", name.text);
			MyDiagnostic.PushException(name, errorMsg);
			return;
		}

		let macro = new IMacro();
		macro.name = name;
		if (params.length !== 0) {
			for (let i = 0; i < params.length; ++i) {
				let part = params[i];
				let label: ILabel = { token: part, labelType: LabelType.Defined };

				let hash = Utils.GetHashcode(part.text);
				if (macro.paramsHashs.has(hash)) {
					let errorMsg = Localization.GetMessage("Label {0} is already defined", part.text);
					MyDiagnostic.PushException(part, errorMsg);
					continue;
				}
				macro.paramsHashs.add(hash);
				macro.params.push(label);
			}

		}

		Compiler.enviroment.allMacro.set(name.text, macro);
		let allSet = Compiler.enviroment.fileMacros.get(name.fileHash) ?? new Set();
		allSet.add(name.text);

		Compiler.enviroment.UpdateMacroRegexString();
		return macro;
	}
	//#endregion 创建一个自定义函数

	//#region 编译自定义函数
	static async CompileMacroLine(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as IMacroLine;
		if (line.label) {
			line.label.value = Compiler.enviroment.orgAddress;
			delete (line.label);		// 删除，不再编译
		}

		let macro: IMacro = line.macro.GetCopy();
		for (let i = 0; i < line.args.length; ++i) {
			let result = ExpressionUtils.GetExpressionValue(line.args[i], ExpressionResult.GetResultAndShowError, option);
			if (result.success) {
				macro.params[i].value = result.value;
			}
		}

		let tempOption: DecodeOption = { allLines: macro.lines, lineIndex: 0, macro: macro };
		await Compiler.CompileResult(tempOption);
		line.compileType = LineCompileType.Finished;
	}
	//#endregion 编译自定义函数

}

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

	private static async FirstAnalyse(option: CommandDecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let name = option.expressions[0];
		option.expressions.splice(0, 1);
		let macro = MacroUtils.CreateMacro(name, option.expressions);
		if (!macro) {
			line.compileType = LineCompileType.Error;
			return;
		}

		line.tag = macro;

		macro.comment = line.comment;
		macro.lines = Commands.CollectBaseLines(option);
		line.tag = macro;
		let tempOption: DecodeOption = {
			allLines: macro.lines,
			lineIndex: 0,
			macro: macro
		};
		line.GetTokens = MacroCommand.GetToken.bind(line);
		await Compiler.FirstAnalyse(tempOption);
	}

	private static async SecondAnalyse_Macro(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let macro: IMacro = line.tag;
		let tempOption: DecodeOption = {
			allLines: macro.lines,
			lineIndex: 0,
			macro: macro
		};
		await Compiler.SecondAnalyse(tempOption);
	}

	private static async ThirdAnalyse(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let macro: IMacro = line.tag;
		let tempOption: DecodeOption = {
			allLines: macro.lines,
			lineIndex: 0,
			macro: macro
		};
		await Compiler.ThirdAnalyse(tempOption);
	}

	private static GetToken(this: ICommandLine) {
		let macro: IMacro = this.tag;
		let result: HighlightToken[] = [];

		result.push({ token: macro.name, type: HighlightType.Macro });

		return result;
	}
}