import { AsmCommon } from "./AsmCommon";

export class Asm65816 extends AsmCommon {
	constructor() {
		super();
		this.Initialize();
		this.UpdateInstructions();
	}

	private Initialize() {

		const modes1 = [
			"#[exp]", "([exp],X)", "([exp]),Y", "[[exp]],Y", "([exp],S),Y",
			"[exp],S", "[exp],X", "[exp],Y", "[[exp]]", "([exp])", "[exp]"
		];

		let opCode = [
			[, 0x69, 0x69], [, 0x61], [, 0x71], [, 0x77], [, 0x73],
			[, 0x63], [, 0x75, 0x7D, 0x7F], [, , 0x79], [, 0x67], [, 0x72], [, 0x65, 0x6D, 0x6F]
		];
		this.Add("ADC", modes1, opCode);

		opCode = [
			[, 0x29, 0x29], [, 0x21], [, 0x31], [, 0x37], [, 0x33],
			[, 0x23], [, 0x35, 0x3D, 0x3F], [, , 0x39], [, 0x27], [, 0x32], [, 0x25, 0x2D, 0x2F]
		];
		this.Add("AND", modes1, opCode);

		this.AddInstruction("ASL", { opCode: [0x0A] });
		this.AddInstruction("ASL", { addressingMode: "[exp],X", opCode: [, 0x16, 0x1E] });
		this.AddInstruction("ASL", { addressingMode: "[exp]", opCode: [, 0x06, 0x0E] });

		const instrs1 = ["BCC", "BCS", "BEQ", "BNE", "BMI", "BPL", "BVC", "BVS", "BRA"];
		const opCode3 = [0x90, 0xB0, 0xF0, 0xD0, 0x30, 0x10, 0x50, 0x70];
		for (let i = 0; i < instrs1.length; ++i)
			this.AddInstruction(instrs1[i], { addressingMode: "[exp]", opCode: [, opCode3[i]] });

		this.AddInstruction("BRL", { addressingMode: "[exp]", opCode: [, , 0x82] });

		this.AddInstruction("BIT", { addressingMode: "#[exp]", opCode: [, 0x89, 0x89] });
		this.AddInstruction("BIT", { addressingMode: "[exp],X", opCode: [, 0x34, 0x3C] });
		this.AddInstruction("BIT", { addressingMode: "[exp]", opCode: [, 0x24, 0x2C] });

		this.AddInstruction("BRK", { opCode: [0x00] });

		const instrs2 = ["CLC", "CLD", "CLI", "CLV", "SEC", "SED", "SEI"];
		const opCode4 = [0x18, 0xD8, 0x58, 0xB8, 0x38, 0xF8, 0x78];
		for (let i = 0; i < instrs1.length; ++i)
			this.AddInstruction(instrs2[i], { opCode: [opCode4[i]] });

		opCode = [
			[, 0xC9, 0xC9], [, 0xC1], [, 0xD1], [, 0xD7], [, 0xD3],
			[, 0xC3], [, 0x22, 0xDD, 0xDF], [, , 0xD9], [, 0xC7], [, 0xD2], [, 0xC5, 0xCD, 0xCF]
		];
		this.Add("CMP", modes1, opCode);

		this.AddInstruction("COP", { opCode: [0x02] });

		this.AddInstruction("CPX", { addressingMode: "#[exp]", opCode: [, 0xE0, 0xE0] });
		this.AddInstruction("CPX", { addressingMode: "[exp]", opCode: [, 0xE4, 0xEC] });

		this.AddInstruction("CPY", { addressingMode: "#[exp]", opCode: [, 0xC0, 0xC0] });
		this.AddInstruction("CPY", { addressingMode: "[exp]", opCode: [, 0xC4, 0xCC] });

		this.AddInstruction("DEC", { opCode: [0x3A] });
		this.AddInstruction("DEC", { addressingMode: "[exp],X", opCode: [, 0xD6, 0xDE] });
		this.AddInstruction("DEC", { addressingMode: "[exp]", opCode: [, 0XC6, 0XCE] });

		this.AddInstruction("DEX", { opCode: [0xCA] });
		this.AddInstruction("DEY", { opCode: [0x88] });

		opCode = [
			[, 0x49, 0x49], [, 0x41], [, 0x51], [, 0x57], [, 0x53],
			[, 0x43],
		]
	}

	private Add(ins: string, modes: string[], codes: Array<number | undefined>[]) {
		for (let i = 0; i < modes.length; ++i)
			this.AddInstruction(ins, { addressingMode: modes[i], opCode: codes[i] });
	}
}