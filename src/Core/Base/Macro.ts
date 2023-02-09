import { IToken } from "../TToken";
import { Utils } from "../Utils";
import { ILabel } from "./Label";
import { IBaseLine } from "../Lines/LineUtils";

export class Macro {
	name!: IToken;
	labels: Map<number, ILabel> = new Map();
	lines!: IBaseLine[];
	comment?: string;

	GetCopy() {
		return Utils.DeepClone<Macro>(this);
	}
}