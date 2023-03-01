import { MyException } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";

export interface IAddressingMode {
	addressType: string[];
	opCode: Array<number | undefined>;
	opCodeLength: Array<number | undefined>;
	spProcess?: (option: DecodeOption) => void;
}

export interface AddressOption {
	spProcess?: (option: DecodeOption) => void;
	/**寻址模式，可用正则表达式 或例如：([exp]),Y */
	addressingMode?: string,
	/**操作码，后续寻址模式长度为 index，例如 LDA #nn，寻址长度为 1byte，所以 0xA9 的下标为1 */
	opCode: Array<number | undefined>;
	/**操作码长度，不输入则系统自动判断 */
	opCodeLength?: Array<number | undefined>;
}

export class AsmCommon {

	/**所有汇编指令 */
	instructions!: string[];
	/**Key为 Instruction，例如：LDA */
	private allInstructions: Map<string, IAddressingMode[]> = new Map();

	constructor() {
		this.ClearAll();
	}

	ClearAll() {
		this.allInstructions.clear();
	}

	UpdateInstructions() {
		this.instructions = [];
		this.allInstructions.forEach((addressingMode, instruction, map) => {
			this.instructions.push(instruction);
		});
	}

	//#region 添加基础指令
	AddInstruction(operation: string, option: AddressOption) {
		operation = operation.toUpperCase();
		let index = this.allInstructions.get(operation);
		if (!index) {
			index = [];
			this.allInstructions.set(operation, index);
		}

		let type: IAddressingMode = { addressType: [] as string[], opCode: [], opCodeLength: [] };
		if (option.addressingMode) {
			let match;
			let start = 0;
			let temp: string;

			let stringMatch: string[] = [];
			let regex = /\[exp\]/g;
			while (match = regex.exec(option.addressingMode)) {
				temp = option.addressingMode.substring(start, match.index).trim();
				if (temp) stringMatch.push(Utils.TransformRegex(temp));
				stringMatch.push("");
				start = match.index + match[0].length;
			}

			temp = option.addressingMode.substring(start).trim();
			if (temp) stringMatch.push(Utils.TransformRegex(temp));

			if (stringMatch.length != 1)
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

	//#region 匹配指令
	MatchAddressingMode(instruction: Token, expression: Token) {
		let addressTypes = this.allInstructions.get(instruction.text.toUpperCase());
		if (!addressTypes) {
			let errorMsg = Localization.GetMessage("Unknow instruction {0}", instruction.text);
			MyException.PushException(instruction, errorMsg);
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
					if (!token.isEmpty)
						result.exprs.push(token);

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
			MyException.PushException(instruction, errorMsg);
			return;
		} else {
			for (let i = 0; i < result.exprs.length; ++i) {
				if (result.exprs[i].isEmpty) {
					let errorMsg = Localization.GetMessage("Expression error");
					MyException.PushException(result.exprs[i], errorMsg);
					return;
				}
			}
		}

		return result;
	}
	//#endregion 匹配指令

}