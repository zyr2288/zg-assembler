import { CommonOption } from "../Base/CommonOption";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Token } from "../Base/Token";
import { BaseLineUtils } from "../BaseLine/BaseLine";
import { InstructionLine } from "../BaseLine/InstructionLine";
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

export interface AddressTypeResult {
	types: number[];
	expression: Token;
}

export class InstructionBase<BaseAddressType = Record<string, AddressType>> {

	/**所有汇编指令关键字 */
	allKeyword: string[] = [];

	/**所有寻址类型，key为寻址类型的英文名称 */
	baseAddressType: Record<string, AddressType> = {};

	/**所有寻址方式匹配 */
	addressTypeMatches: AddressMatchType[] = [];

	/**汇编码寻址方式最大长度，key为汇编码 */
	instructionCodeLengthMax: Record<string, number> = {};

	/** 所有汇编指令，key1 汇编指令，key2 寻址方式的index */
	allInstructions: Record<string, {
		/**寻址方式 */
		addressPro: Record<number, InstructionPart>,
		firstAnalyse?: (option: CommonOption) => boolean,
		thirdAnalyse?: (option: CommonOption) => boolean,
		/**编译获取结果，返回是否继续，false为继续 */
		compile?: (option: CommonOption) => boolean
	}> = {};

	get instructionsRegex() { return new RegExp(this.instructionsRegexStr, "ig"); }

	private instructionsRegexStr: string = "";

	/***** Public *****/

	//#region 获取寻址类型
	/**
	 * 获取寻址类型
	 * @param expression 表达式
	 * @returns 分析结果
	 */
	GetAddressType(expression: Token): AddressTypeResult {
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

	//#region 第一次分析，分析支持寻址方式，以及表达式是否正确
	/**
	 * 第一次分析，分析支持寻址方式，以及表达式是否正确
	 * @param option 编译选项
	 * @returns 是否有误
	 */
	FirstAnalyse(option: CommonOption) {
		let line = <InstructionLine>option.allLine[option.lineIndex];

		if (this.allInstructions[line.keyword.text].firstAnalyse)
			return this.allInstructions[line.keyword.text].firstAnalyse!(option);

		let isFound = false;
		for (let i = 0; i < line.addressType.length; i++) {
			if (this.allInstructions[line.keyword.text].addressPro[line.addressType[i]]) {
				if (this.allInstructions[line.keyword.text].addressPro[line.addressType[i]].codeLength.max == 0) {
					if (!line.expression.isNull) {
						MyException.PushException(line.expression, ErrorType.ExpressionError, ErrorLevel.Show);
						line.errorLine = true;
						return false;
					}
				} else {
					if (line.expression.isNull) {
						MyException.PushException(line.expression, ErrorType.ExpressionError, ErrorLevel.Show);
						line.errorLine = true;
						return false;
					}

					let temp2 = LexerUtils.SplitAndSort(line.expression);
					if (!temp2) {
						line.errorLine = true;
						return false;
					}
					line.expParts = temp2;

				}
				isFound = true;
				break;
			}
		}

		if (!isFound) {
			MyException.PushException(line.keyword, ErrorType.InstructionNotSupportAddress, ErrorLevel.Show);
			line.errorLine = true;
			return false;
		}
		return true;
	}
	//#endregion 第一次分析，分析支持寻址方式，以及表达式是否正确

	//#region 第三次分析，分析每个标签是否存在
	ThirdAnalyse(option: CommonOption) {
		let line = <InstructionLine>option.allLine[option.lineIndex];

		if (this.allInstructions[line.keyword.text].thirdAnalyse)
			return this.allInstructions[line.keyword.text].thirdAnalyse!(option);

		let temp = LexerUtils.CheckLabelsAndShowError(line.expParts, option);
		if (temp)
			line.errorLine = true;

		return !line.errorLine;
	}
	//#endregion 第三次分析，分析每个标签是否存在

	//#region 编译获取结果值
	/**
	 * 编译汇编指令获取结果
	 * @param option 选项
	 */
	InstructionCompile(option: CommonOption) {
		const line = <InstructionLine>option.allLine[option.lineIndex];
		BaseLineUtils.AddressSet(line);

		let keyword = line.keyword;
		let instruction = this.allInstructions[keyword.text];

		if (instruction.compile) {
			let temp = instruction.compile(option);
			BaseLineUtils.AddressAdd(line);
			return temp;
		}

		let types = line.addressType;
		if (line.expression.isNull) {
			let isFound = -1;
			for (let i = 0; i < types.length; i++) {
				if (instruction.addressPro[types[i]] && instruction.addressPro[types[i]].codeLength.max == 0) {
					isFound = i;
					break;
				}
			}

			if (isFound >= 0) {
				line.isFinished = true;
				BaseLineUtils.SetResult(
					line,
					instruction.addressPro[types[isFound]].instructionCode,
					0,
					instruction.addressPro[types[isFound]].instructionCodeLength
				);
				BaseLineUtils.AddressAdd(line);
				return true;
			} else {
				MyException.PushException(keyword, ErrorType.InstructionNotSupportAddress, ErrorLevel.Show);
				return false;
			}
		}

		let exResult = LexerUtils.GetExpressionValue(line.expParts, "getValue", option);
		if (!exResult.success) {
			for (let i = 0; i < types.length; i++) {
				if (instruction.addressPro[types[i]] &&
					instruction.addressPro[types[i]].codeLength.max + instruction.addressPro[types[i]].instructionCodeLength > line.result.length)

					line.result.length = instruction.addressPro[types[i]].codeLength.max + instruction.addressPro[types[i]].instructionCodeLength;
			}
			BaseLineUtils.AddressAdd(line);
			return true;
		}

		let byteLength = Utils.DataByteLength(exResult.value);
		let notFound = true;
		for (let i = 0; i < types.length; i++) {
			let type = types[i];
			if (!instruction.addressPro[type])
				continue;

			let length = line.result.length != 0 ? line.result.length - instruction.addressPro[type].instructionCodeLength : byteLength;
			if (length > instruction.addressPro[type].codeLength.max)
				continue;

			length = length > instruction.addressPro[type].codeLength.min ? length : instruction.addressPro[type].codeLength.min;

			BaseLineUtils.SetResult(line, instruction.addressPro[type].instructionCode, 0, instruction.addressPro[type].instructionCodeLength);
			BaseLineUtils.SetResult(line, exResult.value, instruction.addressPro[type].instructionCodeLength, length);
			line.isFinished = true;
			notFound = false;
			break;
		}

		if (notFound) {
			MyException.PushException(line.expression, ErrorType.ArgumentOutofRange, ErrorLevel.Show);
			return false;
		}

		BaseLineUtils.AddressAdd(line);
		return true;
	}
	//#endregion 编译获取结果值

	/***** Protected *****/

	//#region 更新汇编指令正则表达式的字符串
	/**
	 * 更新汇编指令正则表达式的字符串
	 */
	protected UpdateRegexStr() {
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

	//#region 增加汇编指令
	/**
	 * 增加汇编指令
	 * @param instruction 汇编指令
	 * @param params 参数
	 */
	protected AddInstruction(instruction: string, params: Array<number | keyof BaseAddressType>) {
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
						this.allInstructions[instruction] = { addressPro: {} };

					this.allInstructions[instruction].addressPro[param.index] = ins;

					if (this.instructionCodeLengthMax[instruction] < param.max)
						this.instructionCodeLengthMax[instruction] = params.length;

					break;
			}
		}
	}
	//#endregion 增加汇编指令

	//#region 给汇编指令绑定特殊处理函数
	protected BindFunction(option: {
		firstAnalyse?: (option: CommonOption) => boolean,
		thirdAnalyse?: (option: CommonOption) => boolean,
		compile?: (option: CommonOption) => boolean
	}, ...instructions: string[]) {
		for (let i = 0; i < instructions.length; i++) {
			let ins = this.allInstructions[instructions[i]];
			if (!ins)
				continue;

			ins.firstAnalyse = option.firstAnalyse?.bind(this);
			ins.thirdAnalyse = option.thirdAnalyse?.bind(this);
			ins.compile = option.compile?.bind(this);
		}
	}
	//#endregion 给汇编指令绑定特殊处理函数

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


}