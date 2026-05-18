import { Compiler } from "../Compiler/Compiler";
import { Expression, ExpressionUtils, PriorityType } from "../Base/ExpressionUtils";
import { Macro } from "../Base/Macro";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { Analyser } from "../Compiler/Analyser";
import { CommonLine, LineType } from "./CommonLine";
import { CompileOption } from "../Base/CompileOption";
import { Utils } from "../Base/Utils";
import { LabelLine } from "./LabelLine";
import { HighlightType } from "../LanguageHelper/HighlightingProvider";

/**自定义函数行 */
export class MacroLine {

	/**创建自定义函数的行 */
	static Create(content: { pre: Token, main: Token, rest: Token }, comment?: string) {
		const line = new MacroLine();
		line.label = LabelLine.Create(content.pre, comment);
		line.name = content.main;

		const macro = Compiler.enviroment.allMacro.get(content.main.text)!;
		line.macro = macro;

		const tokens = Analyser.SplitComma(content.rest);
		if (!tokens) {
			if (macro.params.size !== 0) {
				const error = Localization.GetMessage("Macro arguments count is {0}, but got {1}", macro.params.size, 0);
				MyDiagnostic.PushException(content.main, error);
				line.lineType = LineType.Error;
			}
			return line;
		}

		// 不定参数不存在的时候，如果参数数量不匹配
		// 或者不定参数存在的时候，参数数量小于已定义的参数数量
		if (!macro.varParams && macro.params.size !== tokens.length ||
			macro.varParams && tokens.length < macro.params.size) {
			const error = Localization.GetMessage("Macro arguments count is {0}, but got {1}", macro.params.size, tokens.length);
			MyDiagnostic.PushException(content.main, error);
			line.lineType = LineType.Error;
			return;
		}

		// if (macro.params.size !== tokens.length) {
		// 	const error = Localization.GetMessage("Macro arguments count is {0}, but got {1}", macro.params.size, tokens.length);
		// 	MyDiagnostic.PushException(content.main, error);
		// 	line.lineType = LineType.Error;
		// 	return;
		// }

		for (let i = 0; i < tokens.length; i++) {
			const exp = ExpressionUtils.SplitAndSort(tokens[i]);
			if (exp) {
				line.expressions[i] = exp;
			} else {
				const error = Localization.GetMessage("Macro arguments error");
				MyDiagnostic.PushException(tokens[i], error);
				line.lineType = LineType.Error;
			}
		}

		return line;
	}

	static GetLineResult(option: CompileOption, result: number[]) {
		const line = option.GetCurrent<MacroLine>();
		const macro = line.macro;

		const macroOp = new CompileOption();
		macroOp.allLines = macro.lines;

		Compiler.GetLinesResult(macroOp, result);
	}


	/***** class *****/

	label?: LabelLine;

	key: "macro" = "macro";
	lineType = LineType.None;

	name!: Token;
	macro!: Macro;

	/**所有参数表达式 */
	expressions: Expression[] = [];

	AnalyseLabel(option: CompileOption) {
		this.label?.Analyse(option);
	}

	AnalyseThird(option: CompileOption) {
		// const line = option.GetCurrent<MacroLine>();
		// if (line.macro.params.size !== this.expressions.length) {
		// 	const error = Localization.GetMessage("Macro arguments count is {0}, but got {1}", line.macro.params.size, this.expressions.length);
		// 	MyDiagnostic.PushException(this.name, error);
		// 	this.lineType = LineType.Error;
		// 	return;
		// }

		for (let i = 0; i < this.expressions.length; i++) {
			const exp = this.expressions[i];
			ExpressionUtils.CheckLabels(option, exp);
		}
	}

	async Compile(option: CompileOption) {
		this.label?.Compile(option);
		if (Compiler.FirstCompile())
			this.macro = Utils.DeepClone(this.macro);

		let index = 0;
		const keys = this.macro.params.keys();
		for (const key of keys) {
			if (key.endsWith(".length"))
				continue;

			const param = this.macro.params.get(key)!;
			param.exp = this.expressions[index];
			index++;
		}

		// 不定参数
		if (this.macro.varParams) {
			let tempIndex = 0;
			for (let i = index; i < this.expressions.length; i++) {
				const value = ExpressionUtils.GetValue(this.expressions[i].parts, option);
				if (value.success) {
					this.macro.varParams.values[tempIndex] = value.value;
				} else {
					const error = Localization.GetMessage("Expression error");
					const token = ExpressionUtils.CombineExpressionPart(this.expressions[i].parts);
					MyDiagnostic.PushException(token, error);
					this.lineType = LineType.Error;
					return;
				}
				tempIndex++;
			}
			this.macro.params.get(this.macro.varParams.name.text + ".length")!.exp = {
				parts: [{
					highlightType: HighlightType.Number,
					value: this.macro.varParams.values.length,
					token: this.macro.varParams.name.Copy(),
					type: PriorityType.Level_0_Sure
				}],
				stringIndex: -1
			}
		}

		const macroOp = new CompileOption();
		macroOp.allLines = this.macro.lines;
		macroOp.macro = this.macro;

		await Compiler.Compile(macroOp);
	}

}