export class IPlatform<BaseAddressType = Record<string, AddressType>> {
	constructor(name: string) {

	}
	// @ts-ignore
	AddAddressType: (option: { matchType: Array<keyof BaseAddressType>, start?: RegExp, end?: RegExp }) => void;
	// @ts-ignore
	AddInstruction: (instruction: string,
		baseAnalyse: ((baseLine: any, option?: any) => boolean) | undefined,
		otherProcess: ((baseLine: any, option?: any) => boolean) | undefined,
		params: Array<number | keyof BaseAddressType>) => void;
}

export interface AddressType {
	index: number;
	min: number;
	max?: number;
}