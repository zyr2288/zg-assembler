export interface IAddressType {
	addressType?: string;
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

		let type: IAddressType = { opCode, addressType };
	}
}