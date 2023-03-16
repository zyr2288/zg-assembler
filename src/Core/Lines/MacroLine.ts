import { ExpressionPart } from "../Base/ExpressionUtils";
import { ILabel } from "../Base/Label";
import { Token } from "../Base/Token";
import { IMacro } from "../Commands/Macro";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class MacroLine implements ICommonLine {
	type = LineType.Macro;
	compileType = LineCompileType.None;
	orgText!: Token;

	label?: ILabel;
	orgAddress: number = -1;
	baseAddress: number = 0;
	macro!: IMacro;
	macroToken!: Token;
	expParts: ExpressionPart[][] = [];
	result: number[] = [];

	GetTokens() {
		let result: HighlightToken[] = [];
		if (this.label)
			result.push({ type: HighlightType.Label, token: this.label.token });

		result.push({ type: HighlightType.Macro, token: this.macroToken });
		return result;
	}
}