import { CompileOption } from "../Base/CompileOption";
import { LabelType, LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Compiler } from "../Compiler/Compiler";
import { LineType } from "./CommonLine";

export class LabelLine {

	static Create(token: Token, comment?: string) {
		const line = new LabelLine();
		const t = token.Trim();
		if (t.isEmpty)
			return;

		line.labelToken = LabelUtils.RemoveColon(t);
		line.comment = comment;
		return line;
	}

	key: "label" = "label";
	lineType: LineType = LineType.None;
	labelToken!: Token;
	comment?: string;

	/**分析，走第一次编译 */
	Analyse(option: CompileOption) {
		const label = LabelUtils.CreateCommonLabel(this.labelToken, { comment: this.comment, macro: option.macro });
		if (!label) {
			this.lineType = LineType.Error;
			return;
		}

		label.type = LabelType.Label;
	}

	Compile(option: CompileOption) {
		if (Compiler.FirstCompile())
			this.Analyse(option);

		if (this.lineType === LineType.Finished)
			return;

		let label = LabelUtils.FindLabel(this.labelToken, option);
		if (!label)
			return;

		label.type = LabelType.Label;
		label.value = Compiler.enviroment.address.org;
		this.lineType = LineType.Finished;
	}
}