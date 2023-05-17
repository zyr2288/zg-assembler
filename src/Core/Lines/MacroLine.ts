import { ExpressionPart } from "../Base/ExpressionUtils";
import { Token } from "../Base/Token";
import { Macro } from "../Commands/Macro";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class MacroLine implements ICommonLine {
	type = LineType.Macro;
	compileType = LineCompileType.None;
	orgText!: Token;

	labelToken?: Token;
	orgAddress: number = -1;
	baseAddress: number = 0;
	macro!: Macro;
	macroToken!: Token;
	expParts: ExpressionPart[][] = [];
	result: number[] = [];

	GetTokens() {
		let result: HighlightToken[] = [];
		if (this.labelToken)
			result.push({ type: HighlightType.Label, token: this.labelToken });

		result.push({ type: HighlightType.Macro, token: this.macroToken });
		return result;
	}
}