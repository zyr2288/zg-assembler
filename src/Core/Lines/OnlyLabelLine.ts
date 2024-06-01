import { LabelNormal, LabelType, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { CommonSaveLabel, HighlightType, LineCompileType, LineType } from "./CommonLine";

export class OnlyLabelLine {
	type: LineType.OnlyLabel = LineType.OnlyLabel;
	compileType = LineCompileType.None;
	orgText!: Token;

	saveLabel?: CommonSaveLabel;

	comment?: string;

	Initialize(labelToken: Token, option: DecodeOption) {
		this.orgText = labelToken;
		if (labelToken.isEmpty)
			return;

		this.saveLabel = { token: labelToken, label: {} as LabelNormal, notFinish: true };
		this.Analyse(option);
	}

	/**
	 * 分析标签行，用于编译的第一第二次解析
	 * @param option 编译选项
	 * @returns 
	 */
	Analyse(option: DecodeOption) {
		if (!this.saveLabel?.token || this.saveLabel.token.isEmpty)
			return;

		if (this.saveLabel.token.text.endsWith(":"))
			this.saveLabel.token = this.saveLabel.token.Substring(0, this.saveLabel.token.length - 1);

		const label = LabelUtils.CreateLabel(this.saveLabel.token, option, true);
		if (label) {
			label.comment = this.comment;
			label.labelType = LabelType.Label;
			this.saveLabel.label = label;
			this.saveLabel.notFinish = true;
			delete (this.saveLabel.token);
		} else {
			delete (this.saveLabel);
		}
	}


	GetTokens() {
		if (this.saveLabel)
			return [{ type: HighlightType.Label, token: this.saveLabel.label.token }];

		return [];
	}
}