import { IAsmPlatform } from "./IAsmPlatform";
import { AddInstructionOption, Platform } from "./Platform";

/**
 * z80-gb的指令表
 * 
 * https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 */
export class AsmZ80_GB implements IAsmPlatform {

	platformName = "z80-gb";

	constructor() {
		this.Initialize();
	}

	private Initialize() {
		let addressingMode, opCode1, opCode2;

		addressingMode = ["A", "B", "C", "D", "E", "H", "L", "(HL)"];
		opCode1 = [
			// A    B     C     D     E     H     L    (HL)
			[0x7F, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E],		//A
			[0x47, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46],		//B
			[0x4F, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E],		//C
			[0x57, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56],		//D
			[0x5F, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E],		//E
			[0x67, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66],		//H
			[0x6F, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E],		//L
		];
		for (let i = 0; i < addressingMode.length - 1; ++i) {
			for (let j = 0; j < addressingMode.length; ++j) {
				const mode = `${addressingMode[i]},${addressingMode[j]}`;
				Platform.AddInstruction("LD", { addressingMode: mode, opCode: [opCode1[i][j]] });
			}
		}

		addressingMode = "BCDEHL";
		opCode1 = [0x06, 0x0E, 0x16, 0x1E, 0x26, 0x2E];
		for (let i = 0; i < addressingMode.length; ++i)
			Platform.AddInstruction("LD", { addressingMode: `${addressingMode[i]},[exp]`, opCode: [, opCode1[i]] });

		this.A_AddressingMode(["(BC)", "(DE)", "(HL)", "(C)"], [0x0A, 0x1A, 0x7E, 0xF2], [0x02, 0x12, 0x77, 0xE2]);
		this.A_AddressingMode(["(HLD)", "(HL-)"], [0x3A, 0x3A], [0x32, 0x32]);
		Platform.AddInstruction("LDD", { addressingMode: "A,(HL)", opCode: [, 0x3A] });
		Platform.AddInstruction("LDD", { addressingMode: "(HL),A", opCode: [, 0x32] });
		this.A_AddressingMode(["(HLI)", "(HL+)"], [0x2A, 0x2A], [0x22, 0x22]);
		Platform.AddInstruction("LDI", { addressingMode: "A,(HL)", opCode: [, 0x2A] });
		Platform.AddInstruction("LDI", { addressingMode: "(HL),A", opCode: [, 0x22] });

		Platform.AddInstruction("LDH", { addressingMode: "([exp]),A", opCode: [0xE0] });
		Platform.AddInstruction("LDH", { addressingMode: "A,([exp])", opCode: [0xF0] });

		Platform.AddInstruction("LD", { addressingMode: "BC,[exp]", opCode: [, , 0x01] });
		Platform.AddInstruction("LD", { addressingMode: "DE,[exp]", opCode: [, , 0x11] });
		Platform.AddInstruction("LD", { addressingMode: "HL,[exp]", opCode: [, , 0x21] });
		Platform.AddInstruction("LD", { addressingMode: "SP,[exp]", opCode: [, , 0x31] });
		Platform.AddInstruction("LD", { addressingMode: "SP,HL", opCode: [0xF9] });

		Platform.AddInstruction("LDHL", { addressingMode: "SP,[exp]", opCode: [, 0xF8] });
		Platform.AddInstruction("LD", { addressingMode: "([exp]),SP", opCode: [, , 0x08] });

		Platform.AddInstruction("LD", { addressingMode: "([exp]),A", opCode: [, , 0xEA] });
		Platform.AddInstruction("LD", { addressingMode: "A,([exp])", opCode: [, , 0xFA] });
		Platform.AddInstruction("LD", { addressingMode: "A,[exp]", opCode: [, 0x3E] });

		addressingMode = ["AF", "BC", "DE", "HL"];
		opCode1 = [0xF5, 0xC5, 0xD5, 0xE5];
		opCode2 = [0xF1, 0xC1, 0xD1, 0xE1];
		for (let i = 0; i < addressingMode.length; ++i) {
			Platform.AddInstruction("PUSH", { addressingMode: addressingMode[i], opCode: [opCode1[i]] });
			Platform.AddInstruction("POP", { addressingMode: addressingMode[i], opCode: [opCode2[i]] });
		}


		this.StartToA("ADC", 0x88, 0xCE);
		this.StartToA("SUB", 0x90, 0xD6);
		this.StartToA("SBC", 0x98, 0xDE);

		this.OpCodeOneIncrement("AND", 0xA0, 0xE6);

		this.OpCodeOneIncrement("OR", 0xB0, 0xF6);
		this.OpCodeOneIncrement("XOR", 0xA8, 0xEE);
		this.OpCodeOneIncrement("CP", 0xB8, 0xFE);

		this.Single("INC", ["B", "C", "D", "E", "H", "L", "(HL)", "A"], [0x04, 0x0C, 0x14, 0x1C, 0x24, 0x2C, 0x34, 0x3C]);
		this.Single("INC", ["BC", "DE", "HL", "SP"], [0x03, 0x13, 0x23, 0x33]);
		this.Single("DEC", ["B", "C", "D", "E", "H", "L", "(HL)", "A"], [0x05, 0x0D, 0x15, 0x1D, 0x25, 0x2D, 0x35, 0x3D]);
		this.Single("DEC", ["BC", "DE", "HL", "SP"], [0x0B, 0x1B, 0x2B, 0x3B]);

		this.Combine("ADD", "HL", ["BC", "DE", "HL", "SP"], [0x09, 0x19, 0x29, 0x39]);
		this.StartToA("ADD", 0x80, 0xC6);
		Platform.AddInstruction("ADD", { addressingMode: "SP,[exp]", opCode: [, 0xE8] });

		this.Single("SWAP", ["B", "C", "D", "E", "H", "L", "(HL)", "A"], [0x30CB, 0x31CB, 0x32CB, 0x33CB, 0x34CB, 0x35CB, 0x36CB, 0x37CB]);

		Platform.AddInstruction("STOP", { opCode: [0x0010], opCodeLength: [2] });
		this.NoAddModes([
			["DAA", 0x27], ["CPL", 0x2F], ["CCF", 0x3F], ["SCF", 0x37], ["NOP", 0x00],
			["HALT", 0x76], ["DI", 0xF3], ["EI", 0xFB], ["RLCA", 0x07], ["RLA", 0x17],
			["RRCA", 0x0F], ["RRA", 0x1F]
		]);

		this.OpCodeTwoIncrement([
			["RLC", 0x00CB], ["RL", 0x10CB], ["RRC", 0x08CB], ["RR", 0x18CB],
			["SLA", 0x20CB], ["SRA", 0x28CB], ["SRL", 0x38CB]
		]);

		this.Combine("BIT", "[exp]", ["B", "C", "D", "E", "H", "L", "(HL)", "A"], [0x40CB, 0x41CB, 0x42CB, 0x43CB, 0x44CB, 0x45CB, 0x46CB, 0x47CB]);
		this.Combine("SET", "[exp]", ["B", "C", "D", "E", "H", "L", "(HL)", "A"], [0xC0CB, 0xC1CB, 0xC2CB, 0xC3CB, 0xC4CB, 0xC5CB, 0xC6CB, 0xC7CB]);
		this.Combine("RES", "[exp]", ["B", "C", "D", "E", "H", "L", "(HL)", "A"], [0x80CB, 0x81CB, 0x82CB, 0x83CB, 0x84CB, 0x85CB, 0x86CB, 0x87CB]);

		Platform.AddInstruction("JP", { addressingMode: "(HL)", opCode: [0xE9] });
		Platform.AddInstruction("JP", { addressingMode: "NZ,[exp]", opCode: [, , 0xC2] });
		Platform.AddInstruction("JP", { addressingMode: "Z,[exp]", opCode: [, , 0xCA] });
		Platform.AddInstruction("JP", { addressingMode: "NC,[exp]", opCode: [, , 0xD2] });
		Platform.AddInstruction("JP", { addressingMode: "C,[exp]", opCode: [, , 0xDA] });
		Platform.AddInstruction("JP", { addressingMode: "[exp]", opCode: [, , 0xC3] });

		Platform.AddInstruction("JR", { addressingMode: "NZ,[exp]", opCode: [, 0x20] });
		Platform.AddInstruction("JR", { addressingMode: "Z,[exp]", opCode: [, 0x28] });
		Platform.AddInstruction("JR", { addressingMode: "NC,[exp]", opCode: [, 0x30] });
		Platform.AddInstruction("JR", { addressingMode: "C,[exp]", opCode: [, 0x38] });
		Platform.AddInstruction("JR", { addressingMode: "[exp]", opCode: [, 0x18] });

		Platform.AddInstruction("CALL", { addressingMode: "NZ,[exp]", opCode: [, , 0xC4] });
		Platform.AddInstruction("CALL", { addressingMode: "Z,[exp]", opCode: [, , 0xCC] });
		Platform.AddInstruction("CALL", { addressingMode: "NC,[exp]", opCode: [, , 0xD4] });
		Platform.AddInstruction("CALL", { addressingMode: "C,[exp]", opCode: [, , 0xDC] });
		Platform.AddInstruction("CALL", { addressingMode: "[exp]", opCode: [, , 0xCD] });

		for (let i = 0; i < 8; ++i)
			Platform.AddInstruction("RST", { addressingMode: `${(i << 3).toString(16)}H`, opCode: [0xC7 + (i << 3)] });

		Platform.AddInstruction("RET", { addressingMode: "NZ", opCode: [0xC0] });
		Platform.AddInstruction("RET", { addressingMode: "Z", opCode: [0xC8] });
		Platform.AddInstruction("RET", { addressingMode: "NC", opCode: [0xD0] });
		Platform.AddInstruction("RET", { addressingMode: "C", opCode: [0xD8] });
		this.NoAddModes([["RET", 0xC9], ["RETI", 0xD9]]);
	}


	private A_AddressingMode(modes: string[], opCode1: number[], opCode2: number[]) {
		for (let i = 0; i < modes.length; ++i)
			Platform.AddInstruction("LD", { addressingMode: `A,${modes[i]}`, opCode: [, opCode1[i]] });
		for (let i = 0; i < modes.length; ++i)
			Platform.AddInstruction("LD", { addressingMode: `${modes[i]},A`, opCode: [, opCode2[i]] });
	}

	private StartToA(ins: string, start: number, last: number) {
		const modes = ["B", "C", "D", "E", "H", "L", "(HL)", "A", "[exp]"];
		for (let i = 0; i < modes.length; ++i) {
			if (i !== modes.length - 1) {
				Platform.AddInstruction(ins, { addressingMode: `A,${modes[i]}`, opCode: [start++] });
			} else {
				Platform.AddInstruction(ins, { addressingMode: "[exp]", opCode: [, last] });
			}
		}
	}

	private OpCodeOneIncrement(ins: string, start: number, last: number) {
		const modes = ["B", "C", "D", "E", "H", "L", "(HL)", "A", "[exp]"];
		for (let i = 0; i < modes.length; ++i) {
			if (i !== modes.length - 1) {
				Platform.AddInstruction(ins, { addressingMode: modes[i], opCode: [start++] });
			} else {
				Platform.AddInstruction(ins, { addressingMode: "[exp]", opCode: [, last] });
			}
		}
	}

	private OpCodeTwoIncrement(ins: [string, number][]) {
		const modes = ["B", "C", "D", "E", "H", "L", "(HL)", "A"];
		for (let i = 0; i < ins.length; ++i) {
			let value = ins[i][1];
			for (let j = 0; j < modes.length; ++j) {
				Platform.AddInstruction(ins[i][0], { addressingMode: modes[j], opCode: [value], opCodeLength: [2] });
				value += 0x100;
			}
		}

	}

	private Combine(ins: string, left: string, right: string[], opCodes: number[]) {
		for (let i = 0; i < right.length; ++i) {
			Platform.AddInstruction(ins, { addressingMode: `${left},${right[i]}`, opCode: [opCodes[i]] });
		}
	}

	private Single(ins: string, modes: string[], opCodes: number[]) {
		for (let i = 0; i < modes.length; ++i) {
			Platform.AddInstruction(ins, { addressingMode: modes[i], opCode: [opCodes[i]] });
		}
	}

	private NoAddModes(ops: [string, number][]) {
		for (let i = 0; i < ops.length; ++i) {
			Platform.AddInstruction(ops[i][0], { opCode: [ops[i][1]] });
		}
	}

}