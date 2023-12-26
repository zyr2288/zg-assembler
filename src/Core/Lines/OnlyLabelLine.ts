import { ILabel, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { CommonSaveLabel, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class OnlyLabelLine implements ICommonLine {
	type = LineType.OnlyLabel;
	compileType = LineCompileType.None;
	orgText!: Token;

	saveLabel?: CommonSaveLabel;

	comment?: string;

	Initialize(labelToken: Token, option: DecodeOption) {
		if (labelToken.isEmpty)
			return;

		this.saveLabel = { token: labelToken, label: {} as ILabel, notFinish: true };
		LabelUtils.GetLineLabelToken(option);
	}

	GetTokens() {
		if (this.saveLabel)
			return [{ type: HighlightType.Label, token: this.saveLabel.label.token }];

		return [];
	}
}