export class IInstructionBase<BaseAddressType = Record<string, AddressType>> {
	constructor() {

	}
	AddAddressType!: (option: { matchType: Array<keyof BaseAddressType>, start?: RegExp, end?: RegExp }) => void;
	AddInstruction!: (instruction: string, params: Array<number | keyof BaseAddressType>) => void;
}

export interface AddressType {
	index: number;
	min: number;
	max?: number;
}