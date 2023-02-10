import { MyException } from "../Base/MyException";
import { Token } from "../Base/Token";
import { Localization } from "../l10n/Localization";
import { Utils } from "../Utils";

export interface IAddressType {
	addressType: string[] | RegExp;
	opCode: number;
	addMin: number;
	addMax: number;
}

export class AsmCommon {

	/**所有汇编指令 */
	instructions!: string[];
	/**Key为 Instruction，例如：LDA */
	private allInstructions: Map<string, IAddressType[]> = new Map();

	constructor() {
		this.ClearAll();
	}

	ClearAll() {
		this.allInstructions.clear();
		// @ts-ignore
		this.allOperationWord = undefined;
	}

	UpdateInstructions() {
		this.instructions = [];
		this.allInstructions.forEach((value, key, map) => {
			this.instructions.push(key);
		});
	}

	//#region 添加基础指令
	AddInstruction(opCode: number, operation: string, option?: { addressType: string | RegExp, addMin: number, addMax?: number }) {
		operation = operation.toUpperCase();
		let index = this.allInstructions.get(operation);
		if (!index) {
			index = [];
			this.allInstructions.set(operation, index);
		}

		if (!option)
			return;

		let type: IAddressType = { opCode, addressType: [] as string[], addMin: 0, addMax: 0 };
		type.addMin = option.addMin;
		type.addMax = option.addMax ?? type.addMin;

		let match;
		let start = 0;
		let temp: string;

		if (typeof (option.addressType) == "string") {
			let stringMatch: string[] = [];
			let regex = /\[exp\]/g;
			while (match = regex.exec(option.addressType)) {
				temp = option.addressType.substring(start, match.index).trim();
				if (temp) stringMatch.push(Utils.TransformRegex(temp));
				stringMatch.push("");
				start = match.index + match[0].length;
			}

			temp = option.addressType.substring(start).trim();
			if (temp) stringMatch.push(Utils.TransformRegex(temp));

			stringMatch[0] = "^" + stringMatch[0];
			stringMatch[stringMatch.length - 1] = stringMatch[stringMatch.length - 1] + "$";

			type.addressType = stringMatch;
		} else {
			type.addressType = option.addressType;
		}
		index.push(type);
	}
	//#endregion 添加基础指令

	//#region 匹配指令
	MatchAddressType(instruction: Token, expression: Token, fileHash: number) {
		let addressTypes = this.allInstructions.get(instruction.text.toUpperCase());
		if (!addressTypes) {
			let errorMsg = Localization.GetMessage("Unknow instruction {0}", instruction.text);
			MyException.PushException(instruction, fileHash, errorMsg);
			return;
		}

		let result = { type: undefined as IAddressType | undefined, exps: [] as Token[] }
		let start = 0;
		let foundAddressType = false;

		// 每个类型都判断一次
		for (let i = 0; i < addressTypes.length; ++i) {
			const type = addressTypes[i];

			// 重置搜索结果
			result.exps = [];
			result.type = undefined;

			foundAddressType = false;

			//#region 数组类型
			if (type.addressType instanceof Array) {
				if (expression.isEmpty) {
					if (type.addressType.length == 0) {
						result.type = type;
						break;
					}
				} else {
					if (type.addressType.length == 0)
						continue;

					let text = expression.text;
					start = 0;
					foundAddressType = true;
					for (let j = 0; j < type.addressType.length; ++j) {
						if (type.addressType[j] == "")
							continue;

						const regex = new RegExp(type.addressType[j], "i");
						let match = regex.exec(text);
						if (!match) {
							foundAddressType = false;
							break;
						}

						let token = expression.Substring(start, match.index);
						if (!token.isEmpty)
							result.exps.push(token);

						start += match.index + match[0].length;
						text = text.substring(start);
					}

					if (foundAddressType) {
						result.type = type;
						break;
					}
				}
			}
			//#endregion 数组类型

			//#region RegExp类型
			else {
				let match;
				result.type = type;
				start = 0;
				while (match = type.addressType.exec(expression.text)) {
					result.exps.push(expression.Substring(start, match.index));
					start = match.index + match[0].length;
					foundAddressType = true;
				}


				if (foundAddressType)
					break;
			}
			//#endregion RegExp类型

		}
		return result;
	}
	//#endregion 匹配指令

}