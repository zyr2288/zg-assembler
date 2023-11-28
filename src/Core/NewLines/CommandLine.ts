import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { LineType, IBaseLine } from "./BaseLine";

export class CommandLine implements IBaseLine {

	lineNumber!: number;
	label?: number | Token;
	com!: Token;
	type: LineType = LineType.Command;
	expParts: ExpressionPart[][] = [];

	/**初始化后是表达式的逗号分隔 */
	tag?: any;



	/**
	 * 行初始化
	 * @param option.command 命令
	 * @param option.expression 表达式
	 * @param option.labelToken Label的Token
	 */
	Initialize(option: { labelToken?: Token, com: Token, expression?: Token }) {
		this.label = option.labelToken;
		this.com = option.com;
		this.com.text = this.com.text.toUpperCase();
		this.lineNumber = this.com.line;
		if (option.expression) {
			this.tag = Utils.SplitWithComma(option.expression);
		}
	}

}