import { ICommonLine } from "../Lines/CommonLine";
import { Utils } from "./Utils";
import { ILabel } from "./Label";
import { Token } from "./Token";

export class Macro {
	name!: Token;
	labels: Map<number, ILabel> = new Map();
	lines!: ICommonLine[];
	comment?: string;

	GetCopy() {
		return Utils.DeepClone<Macro>(this);
	}
}