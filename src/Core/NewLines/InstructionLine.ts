import { ExpressionPart } from "../Base/ExpressionUtils";
import { Token } from "../Base/Token";
import { IBaseLine, LineType } from "./BaseLine";

export class InstructionLine implements IBaseLine {
	type = LineType.Instruction;

	label?: number | Token;
	com!: Token;
	lineNumber!: number;
	expParts: ExpressionPart[][] = [];

	/**
	 * 行初始化
	 * @param option.label Label的Token
	 * @param option.com 命令
	 * @param option.exp 表达式
	 */
	Initialize(option: { label?: Token, com: Token, exp?: Token }) {
		this.label = option.label;
		this.com = option.com;
		this.com.text = this.com.text.toUpperCase();
		this.lineNumber = this.com.line;
	}
}