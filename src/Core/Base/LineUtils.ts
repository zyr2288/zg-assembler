import { Token } from './Token';

enum ParseType {
	None = -1, Word, Space, LineEnd, Brackets, Operator, Common
}

export class GrammarUtils {

	//#region 分解文本
	/**分解文本 */
	static ParseTexts(text: string) {
		let allLines: string[] = text.split(/\r?\n/);
		let index = 0;
		for (; index < allLines.length; ++index) {

		}
		return;
	}
	//#endregion 分解文本

}