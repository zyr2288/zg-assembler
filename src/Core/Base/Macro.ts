import { CommonLine } from "../Lines/CommonLine";
import { ILabelNormal } from "./Label";
import { Token } from "./Token";

export type IMacro = Macro;

export class Macro {
	/**名称 */
	name!: Token;
	type: "macro" = "macro";
	/**文件编号 */
	fileIndex!: number;
	/**所有标签 */
	labels: Map<string, ILabelNormal> = new Map();
	/**所有参数 */
	params: Map<string, { label: ILabelNormal, values: number[] }> = new Map();
	/**不定参数 */
	// indParams?: { name: Token, values: number[][] };
	/**所有行 */
	lines: CommonLine[] = [];
	/**行偏移 */
	lineOffset: number = 0;
	/**注释 */
	comment?: string;
}