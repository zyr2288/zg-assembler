import { BaseLine, BaseLineFinishType } from "../Base/BaseLine";
import { BaseOption } from "../Base/CompileOption";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { OneWord } from "../Base/OneWord";
import { LexerUtils } from "../Utils/LexerUtils";
import { Utils } from "../Utils/Utils";

/**寻址类型 */
export interface AddressType {
	index: number;
	min: number;
	max?: number;
}

/**汇编寻址类型匹配 */
export interface AddressMatchType {
	start?: RegExp;
	end?: RegExp;
	matchType: number[];
}

/**汇编指令 */
export interface InstructionPart {
	/**指令值 */
	instructionCode: number;
	/**指令长度 */
	instructionCodeLength: number;
	/**寻址长度 */
	codeLength: { min: number, max: number };
}

export class Platform<BaseAddressType = Record<string, AddressType>> {

	/**所有汇编指令关键字 */
	allKeyword: string[] = [];
	/**所有寻址类型，key为寻址类型的英文名称 */
	baseAddressType: Record<string, AddressType> = {};
	/**平台名称 */
	platformName: string;
	/**所有寻址方式匹配 */
	addressTypeMatches: AddressMatchType[] = [];
	/**汇编码寻址方式最大长度，key为汇编码 */
	instructionCodeLengthMax: Record<string, number> = {};
	/** 所有汇编指令，key1 汇编指令，key2 寻址方式的index */
	allInstructions: Record<string, {
		addressPro: Record<number, InstructionPart>,
		baseAnalyse?: (baseLine: BaseLine, option?: BaseOption) => boolean,
		/**编译获取结果，返回是否继续，false为继续 */
		compile?: (baseLine: BaseLine, option?: BaseOption) => boolean
	}> = {};

	get instructionsRegex() { return new RegExp(this.instructionsRegexStr, "ig"); }

	private instructionsRegexStr: string = "";

	//#region 构造函数
	/**
	 * 构造函数
	 * @param platformName 平台名称
	 */
	constructor(platformName: string) {
		this.platformName = platformName;
	}
	//#endregion 构造函数

	//#region 基础分析汇编指令，判断是否支持寻址方式
	/**基础分析汇编指令，判断是否支持寻址方式 */
	InstructionLineBaseAnalyse(baseLine: BaseLine, option?: BaseOption) {
		let temp = this.GetAddressType(baseLine.expression);
		let keyword = baseLine.keyword;
		baseLine.tag = temp.types;

		if (this.allInstructions[keyword.text].baseAnalyse)
			return this.allInstructions[keyword.text].baseAnalyse!(baseLine, option);

		let isFound = false;
		for (let i = 0; i < temp.types.length; i++) {
			if (this.allInstructions[keyword.text].addressPro[temp.types[i]]) {
				if (this.allInstructions[keyword.text].addressPro[temp.types[i]].codeLength.max == 0) {
					if (!temp.expression.isNull) {
						MyException.PushException(temp.expression, ErrorType.ExpressionError, ErrorLevel.Show);
						return false;
					}
				} else {
					if (temp.expression.isNull) {
						MyException.PushException(temp.expression, ErrorType.ExpressionError, ErrorLevel.Show);
						return false;
					}

					let temp2 = LexerUtils.GetExpressionValue(temp.expression, "check", option);
					if (!temp2.success)
						return false;
				}
				isFound = true;
				break;
			}
		}

		if (!isFound) {
			MyException.PushException(keyword, ErrorType.InstructionNotSupportAddress, ErrorLevel.Show);
			return false;
		}

		baseLine.expression = temp.expression;
		return true;
	}
	//#endregion 基础分析汇编指令，判断是否支持寻址方式

	//#region 编译指令分析，获取结果
	/**
	 * 编译指令分析，获取结果
	 * @param baseLine 基础行
	 * @returns 是否继续
	 */
	InstructionAnalyse(baseLine: BaseLine, option?: BaseOption) {
		baseLine.SetAddress();

		let keyword = baseLine.keyword;
		let instruction = this.allInstructions[keyword.text];

		if (instruction.compile) {
			let temp = instruction.compile(baseLine, option);
			baseLine.AddressAdd();
			return temp;
		}

		let types = <number[]>baseLine.tag;
		if (baseLine.expression.isNull) {
			let isFound = -1;
			for (let i = 0; i < types.length; i++) {
				if (instruction.addressPro[types[i]] && instruction.addressPro[types[i]].codeLength.max == 0) {
					isFound = i;
					break;
				}
			}

			if (isFound >= 0) {
				baseLine.finishType = BaseLineFinishType.Finished;
				baseLine.SetResultValue(instruction.addressPro[types[isFound]].instructionCode, 0, instruction.addressPro[types[isFound]].instructionCodeLength);
				baseLine.AddressAdd();
				return true;
			} else {
				MyException.PushException(keyword, ErrorType.InstructionNotSupportAddress, ErrorLevel.Show);
				return false;
			}
		}

		let exResult = LexerUtils.GetExpressionValue(baseLine.expression, "getValue", option);
		if (!exResult.success) {
			for (let i = 0; i < types.length; i++) {
				if (instruction.addressPro[types[i]] &&
					instruction.addressPro[types[i]].codeLength.max + instruction.addressPro[types[i]].instructionCodeLength > baseLine.result.length)
					baseLine.result.length = instruction.addressPro[types[i]].codeLength.max + instruction.addressPro[types[i]].instructionCodeLength;
			}
			baseLine.AddressAdd();
			return true;
		}

		let byteLength = Utils.DataByteLength(exResult.value);
		let notFound = true;
		for (let i = 0; i < types.length; i++) {
			let type = types[i];
			if (!instruction.addressPro[type])
				continue;

			let length = baseLine.resultLength != 0 ? baseLine.resultLength - instruction.addressPro[type].instructionCodeLength : byteLength;
			if (length > instruction.addressPro[type].codeLength.max)
				continue;

			length = length > instruction.addressPro[type].codeLength.min ? length : instruction.addressPro[type].codeLength.min;

			baseLine.SetResultValue(instruction.addressPro[type].instructionCode, 0, instruction.addressPro[type].instructionCodeLength);
			baseLine.SetResultValue(exResult.value, instruction.addressPro[type].instructionCodeLength, length);
			baseLine.finishType = BaseLineFinishType.Finished;
			notFound = false;
			break;
		}

		if (notFound) {
			MyException.PushException(baseLine.expression, ErrorType.ArgumentOutofRange, ErrorLevel.Show);
			return false;
		}

		baseLine.AddressAdd();
		return true;
	}
	//#endregion 编译指令分析，获取结果

	//#region 更新汇编指令正则表达式的字符串
	/**
	 * 更新汇编指令正则表达式的字符串
	 */
	UpdateRegexStr() {
		this.allKeyword = [];
		this.instructionsRegexStr = "(^|\\s+)(";
		for (let key in this.allInstructions) {
			this.instructionsRegexStr += `${key}|`;
			this.allKeyword.push(key);
		}
		this.instructionsRegexStr = this.instructionsRegexStr.substring(0, this.instructionsRegexStr.length - 1);
		this.instructionsRegexStr += ")(\\s+|$)";
	}
	//#endregion 更新汇编指令正则表达式的字符串

	/***** Protected *****/

	//#region 增加汇编指令
	/**
	 * 增加汇编指令
	 * @param instruction 汇编指令
	 * @param baseAnalyse 基础分析接口
	 * @param otherProcess 特殊处理
	 * @param params 参数
	 */
	protected AddInstruction(instruction: string,
		baseAnalyse: ((baseLine: BaseLine, option?: BaseOption) => boolean) | undefined,
		otherProcess: ((baseLine: BaseLine, option?: BaseOption) => boolean) | undefined,
		params: Array<number | keyof BaseAddressType>) {

		const length = 2;
		if (params.length % length != 0 || params.length == 0)
			throw new Error(`参数必须是${length}的倍数且不能为0`);

		let ins: InstructionPart = { instructionCode: 0, instructionCodeLength: 0, codeLength: { min: 0, max: 0 } };
		if (!this.instructionCodeLengthMax[instruction])
			this.instructionCodeLengthMax[instruction] = 0;

		for (let i = 0; i < params.length; i++) {
			switch (i % length) {
				case 0:
					if (typeof params[i] != "number") {
						throw new Error(`第${i}个参数必须为number`);
					}

					ins = { instructionCode: <number>params[i], instructionCodeLength: 0, codeLength: { min: 0, max: 0 } };
					ins.instructionCodeLength = Utils.DataByteLength(ins.instructionCode);
					break;
				case 1:
					if (typeof params[i] != "string") {
						throw new Error(`第${i}个参数必须为string`);
					}

					let param = this.baseAddressType[<string>params[i]];
					if (param.max == undefined)
						param.max = param.min;

					ins.codeLength = { min: param.min, max: param.max };
					if (!this.allInstructions[instruction])
						this.allInstructions[instruction] = { addressPro: {}, baseAnalyse: baseAnalyse?.bind(this), compile: otherProcess?.bind(this) };

					this.allInstructions[instruction].addressPro[param.index] = ins;

					if (this.instructionCodeLengthMax[instruction] < param.max)
						this.instructionCodeLengthMax[instruction] = params.length;

					break;
			}
		}
	}
	//#endregion 增加汇编指令

	//#region 添加寻址类型
	protected AddAddressType(option: { matchType: Array<keyof BaseAddressType>, start?: RegExp, end?: RegExp }) {
		let result: AddressMatchType = { matchType: [], start: option.start, end: option.end };
		for (let i = 0; i < option.matchType.length; i++) {
			const key = <string>option.matchType[i];
			result.matchType.push(this.baseAddressType[key].index);
		}
		this.addressTypeMatches.push(result);
	}
	//#endregion 添加寻址类型

	//#region 获取寻址类型
	/**
	 * 获取寻址类型
	 * @param expression 表达式
	 * @returns 分析结果
	 */
	protected GetAddressType(expression: OneWord): AddressTypeResult {
		let result: AddressTypeResult = { types: [], expression };
		let matchRange = { tempText: expression.text, match: false, start: 0, end: 0 };
		let regex: RegExpExecArray | null;
		for (let i = 0; i < this.addressTypeMatches.length; i++) {
			const matchReg = this.addressTypeMatches[i];
			matchRange.tempText = expression.text;
			matchRange.end = matchRange.tempText.length;
			matchRange.match = false;

			if (matchReg.start && (regex = new RegExp(matchReg.start).exec(matchRange.tempText))) {
				matchRange.start = regex.index + regex[0].length;
				matchRange.tempText = matchRange.tempText.substring(matchRange.start);
				matchRange.match = true;
			}

			if (matchReg.end) {
				matchRange.match = false;
				if ((regex = new RegExp(matchReg.end).exec(matchRange.tempText))) {
					matchRange.end = regex.index;
					matchRange.match = true;
				}
			}

			if (matchRange.match) {
				result.expression = result.expression.Substring(matchRange.start, matchRange.end);
				result.types.push(...this.addressTypeMatches[i].matchType);
				break;
			}
		}
		return result;
	}
	//#endregion 获取寻址类型

}

export interface AddressTypeResult {
	types: number[];
	expression: OneWord;
}