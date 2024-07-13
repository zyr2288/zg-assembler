import { CompileOption } from "../Base/CompileOption";
import { Config } from "../Base/Config";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabelNormal, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { LineResult, LineType } from "./CommonLine";

export class VariableLine {

	/**
	 * 创建一个变量行
	 * @param org 原始行内容
	 * @param content 分割好的内容
	 * @param comment 注释
	 * @returns 
	 */
	static Create(org: Token, content: { pre: Token, main: Token, rest: Token }, comment?: string) {
		const line = new VariableLine();
		line.org = org;

		line.labelToken = content.pre.Trim();

		line.comment = comment;

		if (content.rest.isEmpty) {
			const error = Localization.GetMessage("Expression error");
			MyDiagnostic.PushException(content.rest, error);
			line.lineType = LineType.Error;
			return;
		}

		const temp = ExpressionUtils.SplitAndSort(content.rest);
		if (!temp) {
			line.lineType = LineType.Error;
			return;
		}

		line.expression = temp;

		return line;
	}

	/***** class *****/

	key: "variable" = "variable";
	org!: Token;
	comment?: string;
	lineType: LineType = LineType.None;

	labelToken!: Token;
	expression!: Expression;

	AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<VariableLine>();
		if (Compiler.enviroment.compileTime < 0) {
			const label = LabelUtils.CreateCommonLabel(line.labelToken, { ableNameless: false, comment: line.comment });
			if (!label) {
				line.lineType = LineType.Error;
				return;
			}

			label.type = LabelType.Variable;
			label.comment = line.comment;
		}
	}

	AnalyseThird(option: CompileOption) {
		if (ExpressionUtils.CheckLabels(option, this.expression))
			return;

		const label = LabelUtils.FindLabel(this.labelToken);
		if (!label)
			return;

		const temp = ExpressionUtils.GetValue(this.expression.parts, option);
		if (temp.success)
			label.value = temp.value;
	}


	Compile(option: CompileOption) {
		let label: ILabelNormal | undefined;
		if (Compiler.enviroment.compileTime === 0) {
			label = LabelUtils.CreateCommonLabel(this.labelToken, { ableNameless: false, comment: this.comment }) as ILabelNormal | undefined;
			if (!label) {
				this.lineType = LineType.Error;
				return;
			}
			label.type = LabelType.Variable;
		} else {
			label = LabelUtils.FindLabel(this.labelToken) as ILabelNormal | undefined;
		}

		if (!label)
			return;

		const temp = ExpressionUtils.GetValue(this.expression.parts, option);
		if (temp.success) {
			label.value = temp.value;
			this.lineType = LineType.Finished;
		}
	}
}