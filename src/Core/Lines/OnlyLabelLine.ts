import { ILabel, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class OnlyLabelLine implements ICommonLine {
	type = LineType.OnlyLabel;
	compileType = LineCompileType.None;
	orgText!: Token;

	saveLabel: {
		token?: Token,
		label: ILabel,
		/**是否已经处理完毕 */
		finished: boolean
	} = { label: {} as ILabel, finished: false };

	comment?: string;

	Initialize(labelToken: Token, option: DecodeOption) {
		if (labelToken.isEmpty)
			return;

		this.saveLabel.token = labelToken;
		LabelUtils.GetLineLabelToken(option);
	}

	GetTokens() {
		if (this.saveLabel.label)
			return [{ type: HighlightType.Label, token: this.saveLabel.label.token }];

		return [];
	}
}