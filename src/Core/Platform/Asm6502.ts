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

		const ins2 = [
			"LDA", "LDX", "LDY", "STA", "STX", "STY",
			"ADC"
		];

		const addressingMode2 = [
			"#[exp]", "[exp],X", "[exp],Y", "([exp],X)", "([exp]),Y", "[exp]"
		];

		const opCode2 = [
			// "#[exp]",   "[exp],X",      "[exp],Y",      "([exp],X)",   "([exp]),Y",   "[exp]"
			   [0xA9],     [0xB5, 0xBD],   [-1, 0xB9],     [0xA1],        [0xB1],        [0xA5, 0xAD],          //LDA
			   [0xA2],      null,          [0xB6, 0xBE],    null,          null,         [0xA6, 0xAE],          //LDX
			   [0xA0],     [0xB4, 0xBC],    null,           null,          null,         [0xA4, 0xAC],          //LDY
			    null,      [0x95, 0x9D],   [-1, 0x99],     [0x81],        [0x91],        [0x85, 0x8D],          //STA
			    null,       null,          [0x96],         [0x86, 0x8E],   null,          null,                 //STX
			    null,      [0x94],          null,           null,          null,         [0x84, 0x8C]           //STY
			   [0x69],     [0x75, 0x7D],   [-1, 0x79]
		];

	}
}