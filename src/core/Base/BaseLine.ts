import { Label } from "./Label";
import { OneWord } from "./OneWord";
import { GlobalVar } from "./GlobalVar";
import { ErrorLevel, ErrorType, MyException } from "./MyException";
import { Commands } from "./Commands";
import { Instructions } from "./Instructions";

export enum BaseLineType {
	Unknow, OnlyLebal, Command, Expression, Instruction, Macro, Ignore
}

export enum BaseLineFinishType {
	NotFinished, Finished, ErrorLine, ErrorAndBreak
}

export class BaseLine {

	/***** static *****/

	//#region 分割基本行
	/**
	 * 分割基本行，只能分析出汇编指令和编译器命令
	 * @param text 文本
	 * @param fileHash 文件路径Hash
	 * @param lineNumber 行号，从1开始
	 */
	static SplitBaseLine(text: string, fileHash: number, lineNumber: number) {
		let org = OneWord.CreateWord(text, fileHash, lineNumber, 0);
		if (org.isNull)
			return;

		const { word, comment } = BaseLine.GetComment(org);
		if (word.isNull)
			return;

		let match = Instructions.platform.instructionsRegex.exec(word.text);
		let lebal: Label | undefined;
		if (match) {
			let baseLine = new BaseLine();

			let lebalWord = word.Substring(0, match.index);
			if (!lebalWord.isNull) {
				baseLine.lebalWord = lebalWord;
			}

			baseLine.lineType = BaseLineType.Instruction;
			baseLine.keyword = word.Substring(match.index, match[0].length);
			baseLine.keyword.text = baseLine.keyword.text.toUpperCase();
			baseLine.lebalWord = lebalWord;
			baseLine.expression = word.Substring(match.index + match[0].length);
			baseLine.originalString = org;
			return baseLine;
		}

		match = Commands.commandsRegex.exec(word.text);
		if (match) {
			let baseLine = new BaseLine();
			let lebalWord = word.Substring(0, match.index);
			if (!lebalWord.isNull) {
				baseLine.lebalWord = lebalWord;
			}

			baseLine.lineType = BaseLineType.Command;
			baseLine.keyword = word.Substring(match.index, match[0].length);
			baseLine.keyword.text = baseLine.keyword.text.toUpperCase();
			baseLine.expression = word.Substring(match.index + match[0].length);
			baseLine.originalString = org;
			return baseLine;
		}

		if (word.text.includes("=")) {
			let parts = word.Split(/\s*\=\s*/g, 1);
			let baseLine = new BaseLine();
			baseLine.lineType = BaseLineType.Expression;

			baseLine.lebalWord = parts[0];
			baseLine.expression = parts[1];

			baseLine.originalString = org;
			return baseLine;
		}

		let baseLine = new BaseLine();
		baseLine.lineType = BaseLineType.Unknow;
		baseLine.originalString = org;
		return baseLine;
	}
	//#endregion 分割基本行

	//#region 获取注释内容
	static GetComment(word: OneWord): { word: OneWord, comment: string | undefined } {
		let words = word.Split(/;[\+\-]?/g, 1);
		return {
			word: words[0],
			comment: words[1]?.text
		}
	}
	//#endregion 获取注释内容

	/***** class *****/

	lineType: BaseLineType = BaseLineType.Unknow;
	/**基础行的Lebal的Word */
	lebalWord?: OneWord;
	// @ts-ignore
	keyword: OneWord;
	// @ts-ignore
	expression: OneWord;
	// @ts-ignore
	originalString: OneWord;
	tag: any;
	baseAddress: number = 0;
	originalAddress: number = -1;
	result: number[] = [];
	finishType: BaseLineFinishType = BaseLineFinishType.NotFinished;

	get resultLength(): number { return this.result.length; }

	//#region 设定地址
	SetAddress() {
		if (GlobalVar.env.originalAddress < 0) {
			MyException.PushException(this.originalString, ErrorType.UnknowOriginalAddress, ErrorLevel.ShowAndBreak);
			return false;
		}

		if (this.originalAddress < 0) {
			this.originalAddress = GlobalVar.env.originalAddress;
			this.baseAddress = GlobalVar.env.baseAddress;
		}
		return true;
	}
	//#endregion 设定地址

	//#region 地址增加
	AddressAdd() {
		if (this.originalAddress >= 0){
			GlobalVar.env.originalAddress = this.originalAddress;
			GlobalVar.env.baseAddress = this.baseAddress;
		}

		GlobalVar.env.AddAddress(this.resultLength);
	}
	//#endregion 地址增加

	//#region 设定结果值
	SetResultValue(value: number, index: number, length: number) {
		let temp = length;
		let tempIndex = 0;
		while (temp--) {
			this.result[index + tempIndex] = 0;
			tempIndex++;
		}

		while (length--) {
			this.result[index] = value & 0xFF;
			value >>= 8;
			index++;
		}
	}
	//#endregion 设定结果值

}