import { OneWord } from "./OneWord";

export enum LabelState { Global, Local, Temporary, AllParent }
export enum LabelDefinedState { None, Variable, Defined }

export class Label {
	/**用于查找子属性的关键词 */
	keyword: OneWord;
	word: OneWord;
	parentHash: number = 0;
	child: Record<number, Label> = {};
	/**该Label下所有行号，临时变量使用 */
	lineNumbers: { lineNumber: number, value?: number }[] = [];
	value?: number;
	comment?: string;
	labelScope: LabelState = LabelState.Global;
	/**标签定义属性 */
	labelDefined: LabelDefinedState = LabelDefinedState.None;
	tag?: any;

	get fileHash() { return this.word.fileHash; }
	get lineNumber() { return this.word.lineNumber; }

	constructor() {
		this.keyword = new OneWord();
		this.word = new OneWord();
	}

	GetTemporary(lineNumberIndex: number) {
		if (lineNumberIndex < 0)
			return;

		let lebal = new Label();
		lebal.word = this.word.Copy();
		lebal.value = this.lineNumbers[lineNumberIndex].value;
		lebal.word.lineNumber = this.lineNumbers[lineNumberIndex].lineNumber;
		lebal.labelScope = LabelState.Temporary;
		lebal.labelDefined = LabelDefinedState.Defined;
		return lebal;
	}
}