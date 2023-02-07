import { AsmCommon } from "./AsmCommon";

export class Asm6502 extends AsmCommon {

	constructor() {
		super();
		this.AddIns();

		this.UpdateInstructions();
	}

	private AddIns() {
		this.AddInstruction(0xA9, "LDA", "#[exp]");
	}
}