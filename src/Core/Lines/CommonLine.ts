import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "./CommandLine";
import { InstructionLine } from "./InstructionLine";
import { LabelLine } from "./LabelLine";
import { MacroLine } from "./MacroLine";
import { VariableLine } from "./VariableLine";

export interface HighlightRange {
	type: "dataGroup" | "macro" | "enum";
	key: string;
	startLine: number;
	endLine: number;
}

export type CommonLine = CommandLine | InstructionLine | VariableLine | LabelLine | MacroLine | UnknowLine;

export enum LineType { None, Finished, Error, Ignore }

/**行结果 */
export class LineResult {
	/**结果地址 */
	address = { base: 0, org: -1 };
	/**结果值 */
	result: number[] = [];

	get resultLength() { return this.result.length; }

	/**
	 * 设定结果值
	 * @param value 设定值
	 * @param index 设定的索引
	 * @param length 设定Byte长度
	 * @returns 设定值和是否越界
	 */
	SetResult(value: number, index: number, length: number) {
		let temp = length;
		let tempIndex = 0;

		while (temp--) {
			this.result[index + tempIndex] = 0;
			tempIndex++;
		}

		let setResult = 0;
		let offset = 0;
		while (length--) {
			this.result[index] = value & 0xFF;
			setResult |= this.result[index] << offset;
			value >>>= 8;
			offset += 8;
			index++;
		}

		return { result: setResult, overflow: value !== 0 };
	}

	//#region 设定起始地址
	/**
	 * 设定起始地址
	 * @param line 当前行
	 * @returns true为正确
	 */
	SetAddress() {
		if (Compiler.enviroment.address.org < 0) {
			const errorMsg = Localization.GetMessage("Unknow original address");
			const token = new Token("");
			MyDiagnostic.PushException(token, errorMsg);
		}

		if (this.address.org < 0) {
			this.address.org = Compiler.enviroment.address.org;
			this.address.base = Compiler.enviroment.address.base;
		}

		// if (Compiler.enviroment.fileRange.start < 0) {
		// 	Compiler.enviroment.fileRange.start = Compiler.enviroment.fileRange.end = Compiler.enviroment.baseAddress;
		// 	return;
		// }

		// if (Compiler.enviroment.fileRange.start > Compiler.enviroment.baseAddress)
		// 	Compiler.enviroment.fileRange.start = Compiler.enviroment.baseAddress;
	}
	//#endregion 设定起始地址

	//#region 给文件的地址增加偏移
	AddAddress() {
		if (this.address.org >= 0) {
			Compiler.enviroment.address.org = this.address.org;
			Compiler.enviroment.address.base = this.address.base;
		}

		Compiler.enviroment.address.org += this.resultLength;
		Compiler.enviroment.address.base += this.resultLength;

		// if (Compiler.enviroment.fileRange.end < Compiler.enviroment.baseAddress) {
		// 	Compiler.enviroment.fileRange.end = Compiler.enviroment.baseAddress;
		// 	// console.log(Compiler.enviroment.fileRange.end);
		// }
	}
	//#endregion 给文件的地址增加偏移

}

/**
 * 未知行，通常是 Label 或 MacroLine
 */
export class UnknowLine {
	key: "unknow" = "unknow";
	org!: Token;
	comment?: string;
	lineType: LineType = LineType.None;

	static Create(org: Token, comment?: string) {
		const line = new UnknowLine();
		line.org = org;
		line.comment = comment;
		return line;
	}
}