import { AddressOption, AsmCommon } from "./AsmCommon";

export class Asm65C816 {

	static readonly PlatformName = "65c816";

	constructor() {
		AsmCommon.ClearInstructions();
		this.Initialize();
		AsmCommon.UpdateInstructions();
	}

	private Initialize() {

		const modes1 = [
			"#[exp]", "([exp],X)", "([exp]),Y", "[[exp]],Y", "([exp],S),Y",
			"[exp],S", "[exp],X", "[exp],Y", "[[exp]]", "([exp])", "[exp]"
		];

		let opCode = [
			[, 0x69, 0x69], [, 0x61], [, 0x71], [, 0x77], [, 0x73],
			[, 0x63], [, 0x75, 0x7D, 0x7F], [, , 0x79], [, 0x67], [, 0x72], [, 0x65, 0x6D, 0x6F]
		] as (Array<number | undefined> | undefined)[];
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

		const instrs2 = [
			"CLC", "CLD", "CLI", "CLV", "SEC", "SED", "SEI",
			"PHA", "PHP", "PHX", "PHY", "PLA", "PLP", "PLX", "PLY",
			"PHB", "PHD", "PHK", "PLB", "PLD",
			"RTI", "RTL", "RTS",
			"TAX", "TAY", "TXA", "TYA", "TSX", "TXS", "TXY", "TYX",
			"TCD", "TDC", "TCS", "TSC", "WAI", "XBA", "XCE"
		];
		const opCode4 = [
			0x18, 0xD8, 0x58, 0xB8, 0x38, 0xF8, 0x78,
			0x48, 0x08, 0xDA, 0x5A, 0x68, 0x28, 0xFA, 0x7A,
			0x8B, 0x0B, 0x4B, 0xAB, 0x2B,
			0x40, 0x6B, 0x60,
			0xAA, 0xA8, 0x8A, 0x98, 0xBA, 0x9A, 0x9B, 0xBB,
			0x5B, 0x7B, 0x1B, 0x3B, 0xCB, 0xEB, 0xFB
		];
		for (let i = 0; i < instrs2.length; i++)
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
			[, 0x43], [, 0x55, 0x5D, 0x5F], [, , 0x59], [, 0x47], [, 0x52], [, 0x45, 0x4D, 0x4F]
		];
		this.Add("EOR", modes1, opCode);

		this.AddInstruction("INC", { opCode: [0x1A] });
		this.AddInstruction("INC", { addressingMode: "[exp],X", opCode: [, 0xF6, 0xFE] });
		this.AddInstruction("INC", { addressingMode: "[exp]", opCode: [, 0xE6, 0xEE] });

		this.AddInstruction("INX", { opCode: [0xE8] });
		this.AddInstruction("INY", { opCode: [0xC8] });

		this.AddInstruction("JMP", { addressingMode: "([exp],X)", opCode: [, , 0x7C] });
		this.AddInstruction("JMP", { addressingMode: "[[exp]]", opCode: [, , 0xDC] });
		this.AddInstruction("JMP", { addressingMode: "([exp])", opCode: [, , 0x62] });
		this.AddInstruction("JMP", { addressingMode: "[exp]", opCode: [, , 0x4C, 0x5C] });

		this.AddInstruction("JSL", { addressingMode: "([exp],X)", opCode: [, , 0xFC] });
		this.AddInstruction("JSL", { addressingMode: "[exp]", opCode: [, , 0x20, 0x22] });

		opCode = [
			[, 0xA9, 0xA9], [, 0xA1], [, 0xB1], [, 0xB7], [, 0xB3],
			[, 0xA3], [, 0xB5, 0xBD, 0xBF], [, , 0xB9], [, 0xA7], [, 0xB2], [, 0xA5, 0xAD, 0xAF]
		];
		this.Add("LDA", modes1, opCode);

		this.AddInstruction("LDX", { addressingMode: "#[exp]", opCode: [, 0xA2, 0xA2] });
		this.AddInstruction("LDX", { addressingMode: "[exp],Y", opCode: [, 0xB6, 0xBE] });
		this.AddInstruction("LDX", { addressingMode: "[exp]", opCode: [, 0xA6, 0xAE] });

		this.AddInstruction("LDY", { addressingMode: "#[exp]", opCode: [, 0xA0, 0xA0] });
		this.AddInstruction("LDY", { addressingMode: "[exp],X", opCode: [, 0xB4, 0xBC] });
		this.AddInstruction("LDY", { addressingMode: "[exp]", opCode: [, 0xA4, 0xAC] });

		this.AddInstruction("LSR", { opCode: [0x4A] });
		this.AddInstruction("LSR", { addressingMode: "[exp],X", opCode: [, 0x56, 0x5E] });
		this.AddInstruction("LSR", { addressingMode: "[exp]", opCode: [, 0x46, 0x4E] });

		this.AddInstruction("MVN", { addressingMode: "[exp],[exp]", opCode: [, , 0x54] });
		this.AddInstruction("MVP", { addressingMode: "[exp],[exp]", opCode: [, , 0x44] });

		this.AddInstruction("NOP", { opCode: [0xEA] });

		opCode = [
			[, 0x09, 0x09], [, 0x01], [, 0x11], [, 0x17], [, 0x13],
			[, 0x03], [, 0x15, 0x1D, 0x1F], [, , 0x19], [, 0x07], [, 0x12], [, 0x05, 0x0D, 0x0F]
		];
		this.Add("ORA", modes1, opCode);

		this.AddInstruction("PEA", { addressingMode: "[exp]", opCode: [, , 0xF4] });
		this.AddInstruction("PEI", { addressingMode: "([exp])", opCode: [, 0xD4] });
		this.AddInstruction("PER", { addressingMode: "[exp]", opCode: [, , 0x62] });

		this.AddInstruction("REP", { addressingMode: "#[exp]", opCode: [, 0xC2] });

		this.AddInstruction("ROL", { opCode: [0x2A] });
		this.AddInstruction("ROL", { addressingMode: "[exp],X", opCode: [, 0x36, 0x3E] });
		this.AddInstruction("ROL", { addressingMode: "[exp]", opCode: [, 0x26, 0x2E] });

		opCode = [
			[, 0xE9, 0xE9], [, 0xE1], [, 0xF1], [, 0xF7], [, 0xF3],
			[, 0xE3], [, 0xF5, 0xFD, 0xFF], [, , 0xF9], [, 0xE7], [, 0xF2], [, 0xE5, 0xED, 0xEF]
		];
		this.Add("SBC", modes1, opCode);

		this.AddInstruction("SEP", { addressingMode: "#[exp]", opCode: [, 0xE2] });

		opCode = [
			undefined, [, 0x81], [, 0X91], [, 0x97], [, 0X93],
			[, 0x83], [, 0x95, 0x9D, 0x9F], [, , 0x99], [, 0x87], [, 0x92], [, 0x85, 0x8D, 0x8F]
		];
		this.Add("STA", modes1, opCode);
		this.AddInstruction("STP", { opCode: [0xDB] });

		this.AddInstruction("STX", { addressingMode: "[exp],Y", opCode: [, 0x96] });
		this.AddInstruction("STX", { addressingMode: "[exp]", opCode: [, 0x86, 0x8E] });

		this.AddInstruction("STY", { addressingMode: "[exp],X", opCode: [, 0x94] });
		this.AddInstruction("STY", { addressingMode: "[exp]", opCode: [, 0x84, 0x8C] });

		this.AddInstruction("STZ", { addressingMode: "[exp],X", opCode: [, 0x74, 0x9E] });
		this.AddInstruction("STZ", { addressingMode: "[exp]", opCode: [, 0x64, 0x9C] });

		this.AddInstruction("TRB", { addressingMode: "[exp]", opCode: [, 0x14, 0x1C] });
		this.AddInstruction("TSB", { addressingMode: "[exp]", opCode: [, 0x04, 0x0C] });
	}

	private Add(ins: string, modes: string[], codes: (Array<number | undefined> | undefined)[]) {
		for (let i = 0; i < modes.length; ++i) {
			let opCodes = codes[i];
			if (!opCodes)
				continue;

			this.AddInstruction(ins, { addressingMode: modes[i], opCode: opCodes });
		}
	}

	private AddInstruction(instruction: string, addressingMode: AddressOption) {
		AsmCommon.AddInstructionWithLength(instruction, addressingMode);
	}
}