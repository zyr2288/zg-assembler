import { Compiler } from "../Base/Compiler";
import { MyException } from "../Base/MyException";
import { Token } from "../Base/Token";
import { ICommandLine } from "../Commands/Commands";
import { Localization } from "../i18n/Localization";
import { IInstructionLine } from "./InstructionLine";

export enum LineType {
	Unknow, Instruction, Command, Variable, Macro, OnlyLabel, Delegate
}

export enum LineCompileType {
	None, Error, Finished
}

export enum HighlightType {
	None, Label, Keyword, Macro, Defined, Variable
}

/**通用行接口 */
export interface ICommonLine {
	orgText: Token;
	type: LineType;
	compileType: LineCompileType;
	comment?: string;
	GetTokens?: () => HighlightToken[];
}

export interface HighlightToken {
	type: HighlightType;
	token: Token;
}

export interface IUnknowLine extends ICommonLine {
}

export interface HightlightRange {
	type: "DataGroup" | "Macro";
	start: number;
	end: number;
}

export class CommonLineUtils {

	//#region 设定一行起始位置
	static AddressSet(line: IInstructionLine | ICommandLine) {
		if (Compiler.enviroment.orgAddress < 0) {
			let errorMsg = Localization.GetMessage("Unknow original address");
			MyException.PushException(line.orgText, errorMsg);
			return false;
		}

		if (line.orgAddress < 0) {
			line.orgAddress = Compiler.enviroment.orgAddress;
			line.baseAddress = Compiler.enviroment.baseAddress;
		}
		return true;
	}
	//#endregion 设定一行起始位置

	//#region 地址增加
	static AddressAdd(line: IInstructionLine | ICommandLine) {
		if (line.orgAddress >= 0) {
			Compiler.enviroment.orgAddress = line.orgAddress;
			Compiler.enviroment.baseAddress = line.baseAddress;
		}

		Compiler.enviroment.AddAddress(line.result.length);
	}
	//#endregion 地址增加

	//#region 设定行结果值
	/**
	 * 设定行结果值
	 * @param line 编译行
	 * @param value 设定值
	 * @param index 设定的起始位置
	 * @param length 长度
	 */
	static SetResult(line: IInstructionLine | ICommandLine, value: number, index: number, length: number) {

		let temp = length;
		let tempIndex = 0;
		while (temp--) {
			line.result[index + tempIndex] = 0;
			tempIndex++;
		}

		while (length--) {
			line.result[index] = value & 0xFF;
			value >>= 8;
			index++;
		}
	}
	//#endregion 设定行结果值
}