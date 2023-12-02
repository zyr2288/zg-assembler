import { LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class OnlyLabelLine implements ICommonLine {
	type = LineType.OnlyLabel;
	compileType = LineCompileType.None;
	orgText!: Token;

	label: { token: Token, hash?: number } = { token: {} as Token };

	comment?: string;

	Initialize(labelToken: Token, option: DecodeOption) {
		if (labelToken.isEmpty)
			return;

		this.label.token = labelToken;
		LabelUtils.GetLineLabelToken(option);
	}

	GetTokens() {
		if (this.label.hash)
			return [{ type: HighlightType.Label, token: this.label.token }];

		return [];
	}
}