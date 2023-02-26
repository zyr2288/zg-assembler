import { AsmCommon } from "./AsmCommon";

export class Asm6502 extends AsmCommon {

	constructor() {
		super();
		this.Initialize();

		this.UpdateInstructions();
	}

	private Initialize() {

		const ins1 = [
			"TAY", "TAX", "TSX", "TYA", "TXA", "TXS",
			"PHA", "PHP", "PLA", "PLP",
			"INX", "INY", "DEX", "DEY",
			"RTI", "RTS", "BRK", "NOP",
			"CLC", "CLI", "CLD", "CLV", "SEC", "SEI", "SED"
		];
		const opCode1 = [
			0xA8, 0xAA, 0xBA, 0x98, 0x8A, 0x9A,
			0x48, 0x08, 0x68, 0x28,
			0xE8, 0xC8, 0xCA, 0x88,
			0x40, 0x60, 0x00, 0xEA,
			0x18, 0x58, 0xD8, 0xB8, 0x38, 0x78, 0xF8
		];

		for (let i = 0; i < ins1.length; ++i)
			this.AddInstruction(ins1[i], { opCode: [opCode1[i]] });


			
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