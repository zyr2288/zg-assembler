import { LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class OnlyLabelLine implements ICommonLine {
	type = LineType.OnlyLabel;
	compileType = LineCompileType.None;
	orgText!: Token;

	labelToken?: Token;
	labelHash?: number;

	comment?: string;

	Initialize(labelToken: Token, option: DecodeOption) {
		if (labelToken.isEmpty)
			return;

		this.labelToken = labelToken;
		LabelUtils.GetLineLabelToken(option);
	}

	GetTokens() {
		if (this.labelToken)
			return [{ type: HighlightType.Label, token: this.labelToken }];

		return [];
	}
}