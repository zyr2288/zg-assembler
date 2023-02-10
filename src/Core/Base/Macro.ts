import { ICommonLine } from "../Lines/CommonLine";
import { IToken } from "../TToken";
import { Utils } from "../Utils";
import { ILabel } from "./Label";

export class Macro {
	name!: IToken;
	labels: Map<number, ILabel> = new Map();
	lines!: ICommonLine[];
	comment?: string;

	GetCopy() {
		return Utils.DeepClone<Macro>(this);
	}
}