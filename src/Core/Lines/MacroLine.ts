import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
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
	/**所关联的自定义函数 */
	macro!: Macro;
	/**自定义函数行的函数名Token */
	macroToken!: Token;
	/**自定义函数的所有参数 */
	expParts: ExpressionPart[][] = [];
	result: number[] = [];

	GetTokens() {
		const result: HighlightToken[] = [];
		if (this.labelToken)
			result.push({ type: HighlightType.Label, token: this.labelToken });

		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		result.push({ type: HighlightType.Macro, token: this.macroToken });
		return result;
	}
}