import { Utils } from "../Utils/Utils";
import { Token } from "./Token";

export interface DataGroupPart {
	index: number;
	token: Token;
}

export class DataGroup {
	/**Key是Hash */
	allLabels: Record<number, DataGroupPart> = {};

	PushData(token: Token, index: number) {
		let hash = Utils.GetHashcode(token.text, index);
		let part: DataGroupPart = { index, token };
		this.allLabels[hash] = part;
	}

	FindData(text: string, index: number): DataGroupPart | undefined {
		let hash = Utils.GetHashcode(text, index);
		return this.allLabels[hash];
	}
}