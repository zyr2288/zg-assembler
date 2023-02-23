import { AsmCommon } from "./AsmCommon";

	export class Asm6502 extends AsmCommon {

		constructor() {
			super();
			this.AddIns();

			this.UpdateInstructions();
		}

		private AddIns() {

			this.AddInstruction("TAY", { opCode: [0xA8] });
			this.AddInstruction("TAX", { opCode: [0xAA] });
			this.AddInstruction("TSX", { opCode: [0xBA] });

			this.AddInstruction("LDA", { addressingMode: "#[exp]", opCode: [, 0xA9] });
			this.AddInstruction("LDA", { addressingMode: "[exp],X", opCode: [, 0xB5, 0xBD] });
			this.AddInstruction("LDA", { addressingMode: "[exp],Y", opCode: [, , 0xB9] });
			this.AddInstruction("LDA", { addressingMode: "([exp],X)", opCode: [, 0xA1] });
			this.AddInstruction("LDA", { addressingMode: "([exp]),Y", opCode: [, 0xB1] });
			this.AddInstruction("LDA", { addressingMode: "[exp]", opCode: [, 0xA5, 0xAD] });

			this.AddInstruction("LDX", { addressingMode: "#[exp]", opCode: [, 0xA2] });
			this.AddInstruction("LDX", { addressingMode: "[exp],Y", opCode: [, 0xB6, 0xBE] });
			this.AddInstruction("LDX", { addressingMode: "[exp]", opCode: [, 0xA6, 0xAE] });

			this.AddInstruction("LDY", { addressingMode: "#[exp]", opCode: [, 0xA0] });
			this.AddInstruction("LDY", { addressingMode: "[exp],X", opCode: [, 0xB4, 0xBC] });
			this.AddInstruction("LDY", { addressingMode: "[exp]", opCode: [, 0xA4, 0xAC] });

			this.AddInstruction("STA", { addressingMode: "[exp],X", opCode: [, 0x95, 0x9D] });
			this.AddInstruction("STA", { addressingMode: "[exp],Y", opCode: [, , 0x99] });
			this.AddInstruction("STA", { addressingMode: "([exp],X)", opCode: [, 0x81] });
			this.AddInstruction("STA", { addressingMode: "([exp]),Y", opCode: [, 0x91] });
			this.AddInstruction("STA", { addressingMode: "[exp]", opCode: [, 0x85, 0x8D] });

			this.AddInstruction("STX", { addressingMode: "[exp],Y", opCode: [, 0x96] });
			this.AddInstruction("STX", { addressingMode: "[exp]", opCode: [, 0x86, 0x8E] });

			this.AddInstruction("STY", { addressingMode: "[exp],X", opCode: [, 0x94] });
			this.AddInstruction("STY", { addressingMode: "[exp]", opCode: [, 0x84, 0x8C] });

		}
	}