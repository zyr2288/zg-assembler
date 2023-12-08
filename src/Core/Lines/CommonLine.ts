import { ILabel } from "../Base/Label";
import { Token } from "../Base/Token";

export enum LineType {
	Unknow, Instruction, Command, Variable, Macro, OnlyLabel, Delegate
}

export enum LineCompileType {
	None, Error, Finished, Ignore
}

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

/**通用行接口，不要使用构造函数，否则无法深拷贝 */
export interface ICommonLine {
	orgText: Token;
	type: LineType;
	compileType: LineCompileType;
	comment?: string;
	/**高亮Token */
	GetTokens?: () => HighlightToken[];
}

export interface HighlightToken {
	type: HighlightType;
	token: Token;
}

export interface IOnlyLabel extends ICommonLine {
	label: ILabel;
}

export interface HighlightRange {
	type: "DataGroup" | "Macro" | "Enum";
	key: string;
	startLine: number;
	endLine: number;
}