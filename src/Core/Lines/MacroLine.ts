import { Compiler } from "../Compiler/Compiler";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { Macro } from "../Base/Macro";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Localization } from "../I18n/Localization";
import { Analyser } from "../Compiler/Analyser";
import { CommonLine, LineType } from "./CommonLine";
import { CompileOption } from "../Base/CompileOption";
import { Utils } from "../Base/Utils";
import { LabelLine } from "./LabelLine";

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
		if (!macro.indParams && macro.params.size !== tokens.length ||
			macro.indParams && tokens.length < macro.params.size) {
			const error = Localization.GetMessage("Macro arguments count is {0}, but got {1}", macro.params.size, tokens.length);
			MyDiagnostic.PushException(content.main, error);
			line.lineType = LineType.Error;
			return;
		}

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
		for (let i = 0; i < this.expressions.length; i++) {
			const exp = this.expressions[i];
			ExpressionUtils.CheckLabels(option, exp);
		}
	}

	async Compile(option: CompileOption) {
		this.label?.Compile(option);
		if (Compiler.enviroment.compileTime === 0)
			this.macro = Utils.DeepClone(this.macro);

		let index = 0;

		const keys = this.macro.params.keys();
		for (const key of keys) {
			const exp = this.expressions[index];
			const temp = ExpressionUtils.GetStringValue(exp, { macro: option.macro });
			index++;

			if (!temp.success)
				continue;

			const param = this.macro.params.get(key)!;
			param.values = temp.values;

			if (temp.values.length === 1)
				param.label.value = temp.values[0];
		}

		if (this.macro.indParams) {
			let tempIndex = 0;
			for (let i = index; i < this.expressions.length; i++) {
				const exp = this.expressions[index];
				const temp = ExpressionUtils.GetStringValue(exp, { macro: option.macro });
				if (temp.success) {
					this.macro.indParams.values[tempIndex] = temp.values;
				}

				tempIndex++;
			}
		}


		const macroOp = new CompileOption();
		macroOp.allLines = this.macro.lines;
		macroOp.macro = this.macro;

		await Compiler.Compile(macroOp);
	}

}