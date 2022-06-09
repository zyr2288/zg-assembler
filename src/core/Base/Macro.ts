import { IBaseLine } from "../BaseLine/BaseLine";
import { Label } from "./Label";
import { Token } from "./Token";

export class Macro {

	/***** Class *****/

	name!: Token;
	labels: Record<number, Label> = {};
	lines: IBaseLine[] = [];
	comment?: string;
	parameterHash: number[] = [];
	get parameterCount() { return this.parameterHash.length }

	Copy() {
		let macro = new Macro();
		macro.name = this.name.Copy();
	}
}