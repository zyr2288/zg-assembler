import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { Completion } from "../LanguageHelper/IntellisenseProvider";
import { Platform } from "./Platform";

export interface IAddressingMode {
	/**寻址正则表达式的分割 */
	addressType: string[];
	/**寻址模式，正则表达式 或例如：([exp]),Y */
	addressingMode?: string;
	opCode: Array<number | undefined>;
	opCodeLength: Array<number | undefined>;
	spProcess?: (option: DecodeOption) => void;
}

export interface AddressOption {
	/**汇编模式特殊处理 */
	spProcess?: (option: DecodeOption) => void;
	/**寻址模式，可用正则表达式 或例如：([exp]),Y */
	addressingMode?: string,
	/**操作码，后续寻址模式长度为 index，例如 LDA #nn，寻址长度为 1byte，所以 0xA9 的下标为1 */
	opCode: Array<number | undefined>;
	/**操作码长度，不输入则系统自动判断 */
	opCodeLength?: Array<number | undefined>;
}

export interface IAsmCommon {
	Intellisense?: () => Completion[] | void;
}

export class AsmCommon {

	/***** static *****/

	static PlatformName: string;
	/**所有汇编指令 */
	static instructions: string[];
	/**Key为 Instruction，例如：LDA */
	static allInstructions: Map<string, IAddressingMode[]> = new Map();

	//#region 清除所有汇编指令
	/**清除所有汇编指令 */
	static ClearInstructions() {
		AsmCommon.allInstructions.clear();
	}
	//#endregion 清除所有汇编指令

	//#region 更新汇编指令
	/**
	 * 更新汇编指令
	 */
	static UpdateInstructions() {
		AsmCommon.instructions = [];
		AsmCommon.allInstructions.forEach((addressingMode, instruction, map) => {
			AsmCommon.instructions.push(instruction);
		});
	}
	//#endregion 更新汇编指令

	//#region 添加基础指令
	/**
	 * 添加基础指令
	 * @param operation 汇编指令，例如：LDA
	 * @param option 
	 */
	static AddInstruction(operation: string, option: AddressOption) {
		Platform.allInstruction.add(operation);
		operation = operation.toUpperCase();
		let index = AsmCommon.allInstructions.get(operation);
		if (!index) {
			index = [];
			AsmCommon.allInstructions.set(operation, index);
		}

		let type: IAddressingMode = { addressingMode: option.addressingMode, addressType: [] as string[], opCode: [], opCodeLength: [] };
		if (option.addressingMode) {
			let match;
			let start = 0;
			let temp: string;

			let stringMatch: string[] = [];
			let regex = /\[exp\]/g;
			while (match = regex.exec(option.addressingMode)) {
				temp = option.addressingMode.substring(start, match.index).trim();
				if (temp)
					stringMatch.push(Utils.TransformRegex(temp));

				stringMatch.push("");
				start = match.index + match[0].length;
			}

			temp = option.addressingMode.substring(start).trim();
			if (temp) stringMatch.push(Utils.TransformRegex(temp));

			if (stringMatch.length !== 1)
				stringMatch[0] = "^" + stringMatch[0];

			stringMatch[stringMatch.length - 1] = stringMatch[stringMatch.length - 1] + "$";

			type.addressType = stringMatch;
		}

		type.opCode = option.opCode;
		type.spProcess = option.spProcess;

		if (!option.opCodeLength) {
			for (let i = 0; i < type.opCode.length; ++i) {
				if (type.opCode[i] === undefined)
					continue;

				type.opCodeLength[i] = Utils.GetNumberByteLength(type.opCode[i]!);
			}
		} else {
			type.opCodeLength = option.opCodeLength;
		}


		index.push(type);
	}
	//#endregion 添加基础指令

	//#region 添加额外定长汇编指令
	/**
	 * 添加额外定长汇编指令
	 * @param instruction 汇编指令
	 * @param addressingMode 地址模式
	 * @returns 
	 */
	static AddInstructionWithLength(instruction: string, addressingMode: AddressOption) {
		AsmCommon.AddInstruction(instruction, addressingMode);
		let count = addressingMode.opCode.filter(v => v !== undefined);
		if (count.length < 2)
			return;

		for (let j = 1; j < addressingMode.opCode.length; j++) {
			let opcode = addressingMode.opCode[j];
			if (opcode === undefined)
				continue;

			let tempCodes = [];
			tempCodes.length = j + 1;
			tempCodes[j] = opcode;
			AsmCommon.AddInstruction(`${instruction}.${j}`, { addressingMode: addressingMode.addressingMode, opCode: tempCodes });
		}
	}
	//#endregion 添加额外定长汇编指令

	//#region 匹配指令
	/**
	 * 匹配指令
	 * @param instruction 汇编指令
	 * @param expression 表达式
	 * @returns 
	 */
	static MatchAddressingMode(instruction: Token, expression: Token) {
		let addressTypes = AsmCommon.allInstructions.get(instruction.text.toUpperCase());
		if (!addressTypes) {
			let errorMsg = Localization.GetMessage("Unknow instruction {0}", instruction.text);
			MyDiagnostic.PushException(instruction, errorMsg);
			return;
		}

		let result = { addressingMode: {} as IAddressingMode, exprs: [] as Token[] }
		let start = 0;
		let foundAddressType = false;

		// 每个类型都判断一次
		for (let i = 0; i < addressTypes.length; ++i) {
			const type = addressTypes[i];

			// 重置搜索结果
			result.exprs = [];
			foundAddressType = false;

			// 表达式为空
			if (expression.isEmpty) {
				if (type.addressType.length === 0) {
					foundAddressType = true;
					result.addressingMode = type;
					break;
				}
			}

			// 表达式不为空
			else {
				if (type.addressType.length === 0)
					continue;

				let text = expression.text;
				start = 0;
				foundAddressType = true;
				for (let j = 0; j < type.addressType.length; ++j) {
					if (type.addressType[j] === "")
						continue;

					const regex = new RegExp(type.addressType[j], "i");
					let match = regex.exec(text);
					if (!match) {
						foundAddressType = false;
						break;
					}

					let token = expression.Substring(start, match.index);
					if (!type.addressType[j].startsWith("^")) {
						result.exprs.push(token);
					}

					start += match.index + match[0].length;
					text = text.substring(start);
				}

				if (foundAddressType) {
					result.addressingMode = type;
					break;
				}
			}
		}

		if (!foundAddressType) {
			let errorMsg = Localization.GetMessage("Instruction {0} do not support this addressing mode", instruction.text);
			MyDiagnostic.PushException(instruction, errorMsg);
			return;
		} else {
			for (let i = 0; i < result.exprs.length; ++i) {
				if (result.exprs[i].isEmpty) {
					let errorMsg = Localization.GetMessage("Expression error");
					MyDiagnostic.PushException(result.exprs[i], errorMsg);
					return;
				}
			}
		}

		return result;
	}
	//#endregion 匹配指令

	//#region 判断输入内容是否在忽略内容内
	/**判断输入内容是否在忽略内容内 */
	static MatchLinePosition(instruction: string, restText: string, restCurrect: number) {
		instruction = instruction.toUpperCase();
		const modes = AsmCommon.allInstructions.get(instruction);
		if (!modes)
			return false;

		for (let i = 0; i < modes.length; i++) {
			let adType = modes[i].addressType;
			let expRange = [];
			for (let j = 0; j < adType.length; j++) {
				if (adType[j] === "")
					continue;

				const regex = new RegExp(adType[j], "i");
				let match = regex.exec(restText);
				if (!match) {
					expRange = [];
					break;
				}

				if (match[0].length !== 0 &&
					match.index <= restCurrect &&
					restCurrect <= match.index + match[0].length - 1) {
					return true;
				}
			}
		}
	}
	//#endregion 判断输入内容是否在忽略内容内

}

export interface AsmInstruction {
	name: string;
}
