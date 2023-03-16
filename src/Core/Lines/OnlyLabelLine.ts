import { ILabel, LabelType } from "../Base/Label";
import { Token } from "../Base/Token";
import { HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class OnlyLabelLine implements ICommonLine {
	type = LineType.OnlyLabel;
	compileType = LineCompileType.None;
	orgText!: Token;
	label?: ILabel;

	comment?: string;

	constructor(label?: ILabel, comment?: string) {
		this.label = label;
		if (this.label) {
			this.label.labelType = LabelType.Label;
			this.label.comment = comment;
		}
	}

	GetTokens() {
		if (this.label)
			return [{ type: HighlightType.Label, token: this.label.token }];

		return [];
	}
}