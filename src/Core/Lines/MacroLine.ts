import { Expression, ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { Token } from "../Base/Token";
import { MacroInstance } from "../Commands/Macro";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class MacroLine {
	type: LineType.Macro = LineType.Macro;
	compileType = LineCompileType.None;
	orgText!: Token;

	orgAddress: number = -1;
	baseAddress: number = 0;
	/**所关联的自定义函数 */
	macro!: MacroInstance;
	/**自定义函数行的函数名Token */
	macroToken!: Token;
	/**自定义函数的所有参数 */
	expression: Expression[] = [];
	result: number[] = [];

	GetTokens() {
		const result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expression));
		result.push({ type: HighlightType.Macro, token: this.macroToken });
		return result;
	}
}