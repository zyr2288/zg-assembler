import { CommonLine } from "../Lines/CommonLine";
import { Expression } from "./ExpressionUtils";
import { ILabelNormal } from "./Label";
import { Token } from "./Token";

export class Macro {
	/**名称 */
	name!: Token;
	/**文件编号 */
	fileIndex!: number;
	/**所有标签 */
	labels: Map<string, ILabelNormal> = new Map();
	/**所有参数 */
	params: Map<string, { label: ILabelNormal, exp?: Expression }> = new Map();
	/**不定参数 */
	varParams?: { name: Token, values: number[] };
	/**所有行 */
	lines: CommonLine[] = [];
	/**行偏移 */
	lineOffset: number = 0;
	/**注释 */
	comment?: string;
}