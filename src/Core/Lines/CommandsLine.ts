import { Token } from "../Base/Token";
import { ICommonLine, LineType } from "./CommonLine";

/**命令行 */
export interface ICommandLine extends ICommonLine {
	/**标签 */
	labelToken?: Token;
	/**命令 */
	command: Token;
	/**表达式 */
	expression: Token;
	/**结果 */
	result?: number[];
}