import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { Token } from "../Base/Token";
import { HighlightToken, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class CommandLine implements ICommonLine {

	type: LineType = LineType.Command;
	compileType = LineCompileType.None;

	orgText!: Token;
	comment?: string;

	orgAddress = -1;
	baseAddress = 0;

	command!: Token;
	expression?: Token;
	expParts: ExpressionPart[][] = [];
	result: number[] = [];

	tag?: any;

	/**
	 * 行初始化
	 * @param option.command 命令
	 * @param option.expression 表达式
	 * @param option.labelToken Label的Token
	 */
	Initialize(option: { command: Token, expression: Token }) {
		this.command = option.command;
		this.command.text = this.command.text.toUpperCase();
		this.expression = option.expression;
	}

	SetResult(value: number, index: number, length: number): number {
		return Compiler.SetResult(this, value, index, length);
	}

	SetAddress() {
		Compiler.SetAddress(this);
	}

	AddAddress() {
		Compiler.AddAddress(this);
	}

	GetTokens() {
		const result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}
}