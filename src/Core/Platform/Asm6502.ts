import { AsmCommon } from "./AsmCommon";

export class Asm6502 extends AsmCommon {

	constructor() {
		super();
		this.AddIns();

		this.UpdateInstructions();
	}

	private AddIns() {
		this.AddInstruction(0xA9, "LDA", { addressType: "#[exp]", addMin: 1 });
		this.AddInstruction(0xB1, "LDA", { addressType: "([exp]),Y", addMin: 1 });
		this.AddInstruction(0xFF, "LDA", { addressType: "[exp],[exp]", addMin: 2 });
	}
}