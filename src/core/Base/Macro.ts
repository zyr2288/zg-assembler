import { BaseLine } from "./BaseLine";
import { Label } from "./Label";
import { OneWord } from "./OneWord";

export class Macro {

	name = <OneWord>{};
	labels: Record<number, Label> = {};
	baseLines: BaseLine[] = [];
	comment?: string;
	parameterHash: number[] = [];
	get parameterCount() { return this.parameterHash.length }

	Copy() {
		let macro = new Macro();
		macro.name = this.name.Copy();
	}
}