import { ExpressionPart } from "../Base/ExpressionUtils";
import { Token } from "../Base/Token";

//#region 高亮类型
/**高亮类型 */
export enum HighlightType {
	/**无 */
	None,
	/**标签 */
	Label,
	/**关键字 */
	Keyword,
	/**自定义函数 */
	Macro,
	/**定义的常量 */
	Defined,
	/**定义的变量 */
	Variable,
	/**数字 */
	Number,
}
//#endregion 高亮类型

export interface HighlightToken {
	type: HighlightType;
	token: Token;
}

export enum LineType {
	Instruction, Command, OnlyLabel, Macro
}

/**所有基础行 */
export interface IBaseLine {
	/**行号 */
	lineNumber: number;
	/**标签的Token，转换之后变成number */
	label?: number | Token;
	/** 
	 * 汇编指令
	 * 
	 * 编译器命令
	 * 
	 * 自定义函数
	 * 
	 * 变量（则这里是空） */
	com?: Token;
	/**所有表达式的小节 */
	expParts: ExpressionPart[][];
	/**基础行类型 */
	type: LineType;
	/**附加值 */
	tag?: any;
	/**获取高亮的Token */
	GetHighlightTokens?: () => HighlightToken[];
}