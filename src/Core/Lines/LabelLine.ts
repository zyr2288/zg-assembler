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

	Analyse() {
		if (Compiler.enviroment.compileTime >= 0)
			return;

		const label = LabelUtils.CreateCommonLabel(this.labelToken, { comment: this.comment });
		if (!label) {
			this.lineType = LineType.Error;
			return;
		}

		label.type = LabelType.Label;
		this.lineType = LineType.Finished;
	}

	Compile(option: CompileOption) {
		if (this.lineType !== LineType.None)
			return;

		let label;
		if (Compiler.enviroment.compileTime === 0) {
			label = LabelUtils.CreateCommonLabel(this.labelToken, { macro:option.macro, comment: this.comment });
			if (!label) {
				this.lineType = LineType.Error;
				return;
			}
		} else {
			label = LabelUtils.FindLabel(this.labelToken, option);
		}

		if (!label)
			return;

		label.type = LabelType.Label;
		label.value = Compiler.enviroment.address.org;
		this.lineType = LineType.Finished;
	}
}