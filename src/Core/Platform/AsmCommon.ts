import { Token } from "../Base/Token";

export interface IAddressType {
	addressType: string[];
	opCode: number;
}

export class AsmCommon {

	instructions!: string[];
	private allOperation: Map<string, number> = new Map();
	private allAddressType: Map<number, IAddressType[]> = new Map();

	constructor() {
		this.ClearAll();
	}

	ClearAll() {
		this.allOperation.clear();
		this.allAddressType.clear();
		// @ts-ignore
		this.allOperationWord = undefined;
	}

	UpdateInstructions() {
		this.instructions = [];
		this.allOperation.forEach((value, key, map) => {
			this.instructions.push(key);
		});
	}

	// 例如 A9 LDA #n
	AddInstruction(opCode: number, operation: string, addressType?: string) {
		operation = operation.toUpperCase();
		let index = this.allOperation.get(operation);
		if (index == undefined) {
			index = this.allOperation.size;
			this.allOperation.set(operation, index);
		}

		let type: IAddressType = { opCode, addressType: [] };
		if (!addressType)
			return;

		let match;
		let start = 0;

		while (match = /\[exp\]/.exec(addressType)) {

			type.addressType.push(addressType.substring(start, match.index).trim());
			type.addressType.push(addressType.substring(match.index, match[0].length).trim());
			start = match.index + match[0].length;
		}

		type.addressType.push(addressType.substring(start).trim());
	}

	MatchAddressType(expression: Token) {

	}
}