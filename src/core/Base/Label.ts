import { Token } from "./Token";

export enum LabelState { Global, Local, Temporary, AllParent }
export enum LabelDefinedState { None, Variable, Defined, Label }

export class Label {
	/**用于查找子属性的关键词 */
	keyword: Token;
	/**整个属性 */
	word: Token;
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
		this.keyword = new Token();
		this.word = new Token();
	}

	GetTemporary(lineNumberIndex: number) {
		if (lineNumberIndex < 0)
			return;

		let label = new Label();
		label.word = this.word.Copy();
		label.value = this.lineNumbers[lineNumberIndex].value;
		label.word.lineNumber = this.lineNumbers[lineNumberIndex].lineNumber;
		label.labelScope = LabelState.Temporary;
		label.labelDefined = LabelDefinedState.Defined;
		return label;
	}
}