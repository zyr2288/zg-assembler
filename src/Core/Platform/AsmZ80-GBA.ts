import { CompileOption } from "../Base/CompileOption";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Localization } from "../I18n/Localization";
import { LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { IAsmPlatform } from "./IAsmPlatform";
import { Platform } from "./Platform";

/**
 * z80-gba的指令表
 * 
 * https://github.com/kolen/z80-opcode-table/blob/master/table_ref.txt
 * 
 * https://sndream.github.io/PanDocs/#cpucomparisionwithz80
 */
export class AsmZ80_GB implements IAsmPlatform {

	platformName = "z80-gba";

	constructor() {
		this.Initialize();
	}

	private Initialize() {
		let instructions, addressingMode, opCode;

		// ********** LD **********
		addressingMode = ["A", "B", "C", "D", "E", "H", "L", "(HL)"];
		opCode = [
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
				Platform.AddInstruction("LD", { addressingMode: mode, opCode: [opCode[i][j]] });
			}
		}

		Platform.AddInstruction("LD", { addressingMode: "(BC),A", opCode: [0x02] });
		Platform.AddInstruction("LD", { addressingMode: "(DE),A", opCode: [0x12] });


		this.AddSerialsAddMode("LD", ["B", "C", "D", "E", "H", "L", "(HL)", "A"], 0x06, 1, 8);
		Platform.AddInstruction("LD", { addressingMode: "SP,HL", opCode: [0xF9] });
		this.AddSerialsAddMode("LD", ["BC", "DE", "HL", "SP"], 0x01, 2, 0x10)

		Platform.AddInstruction("LD", { addressingMode: "([exp]),HL", opCode: [0x22] });
		Platform.AddInstruction("LD", { addressingMode: "([exp]),A", opCode: [0x32] });

		// ********** ADD ADC SUB SBC AND XOR OR CP **********
		this.StartToA("ADD", 0x80, 0xC6);
		this.StartToA("ADC", 0x88, 0xCE);
		this.StartToA("SUB", 0x90, 0xD6);
		this.StartToA("SBC", 0x98, 0xDE);
		this.StartToA("AND", 0xA0, 0xE6);
		this.StartToA("XOR", 0xA8, 0xEE);
		this.StartToA("OR", 0xB0, 0xF6);
		this.StartToA("CP", 0xB8, 0xFE);

		// ********** INC DEC **********
		addressingMode = ["BC", "DE", "HL", "SP"];
		this.AddSerialsAddMode("INC", addressingMode, 0x03, 0, 0x10);
		this.AddSerialsAddMode("DEC", addressingMode, 0x0B, 0, 0x10);

		addressingMode = ["B", "D", "H", "(HL)"];
		this.AddSerialsAddMode("INC", addressingMode, 0x04, 0, 0x10);
		this.AddSerialsAddMode("DEC", addressingMode, 0x05, 0, 0x10);

		addressingMode = ["C", "E", "L", "A"];
		this.AddSerialsAddMode("INC", addressingMode, 0x0C, 0, 0x10);
		this.AddSerialsAddMode("DEC", addressingMode, 0x0D, 0, 0x10);

		// ********** DJNZ JR **********
		Platform.AddInstruction("DJNZ", { addressingMode: "[exp]", opCode: [, 0x10], spProcess: this.SpecialJR.bind(this) });
		this.AddSerialsAddMode("JR", ["C,[exp]", "NC,[exp]", "Z,[exp]", "NZ,[exp]", "[exp]"], 0x38, 1, -8);

		// ********** JP **********
		Platform.AddInstruction("JP", { addressingMode: "(HL)", opCode: [0xE9] });
		this.AddSerialsAddMode("JP", ["NZ,[exp]", "Z,[exp]", "NC,[exp]", ",[exp]C", "PO,[exp]", "PE,[exp]", "P,[exp]", "M,[exp]"], 0xC2, 2, 8);
		Platform.AddInstruction("JP", { addressingMode: "[exp]", opCode: [, , 0xC3] });

		// ********** RET POP PUSH CALL RST **********
		this.AddSerialsAddMode("RET", ["NZ", "Z", "NC", "C", "PO", "PE", "P", "M"], 0xC0, 0, 0x10);
		Platform.AddInstruction("RET", { opCode: [0xC9] });
		this.AddSerialsAddMode("POP", ["BC", "DE", "HL", "AF"], 0xC1, 0, 0x10);
		this.AddSerialsAddMode("PUSH", ["BC", "DE", "HL", "AF"], 0xC1, 0, 0x10);
		this.AddSerialsAddMode("CALL", ["NZ,[exp]", "Z,[exp]", "NC,[exp]", ",[exp]C", "PO,[exp]", "PE,[exp]", "P,[exp]", "M,[exp]"], 0xC4, 2, 8);
		Platform.AddInstruction("CALL", { addressingMode: "[exp]", opCode: [, , 0xC9] });
		this.AddSerialsAddMode("RST", ["00", "08", "10", "18", "20", "28", "30", "38"], 0xC7, 0, 8);

		// ********** OUT EX DI EXX IN EI **********
		Platform.AddInstruction("OUT", { addressingMode: "([exp]),A", opCode: [, 0xD3] });
		this.AddSerialsAddMode("EX", ["(SP),HL", "DE,HL"], 0xE3, 0, 8);
		Platform.AddInstruction("DI", { opCode: [0xF3] });
		Platform.AddInstruction("EXX", { opCode: [0xD9] });
		Platform.AddInstruction("IN", { addressingMode: "A,([exp])", opCode: [, 0xDB] });
		Platform.AddInstruction("EI", { opCode: [0xFB] });

		// ********** CB **********
		instructions = ["RLC", "RRC", "RL", "RR", "SLA", "SRA", "SWAP", "SRL"];
		addressingMode = ["B", "C", "D", "E", "H", "L", "(HL)", "A"];
		opCode = 0x00;
		for (let i = 0; i < instructions.length; i++) {
			for (let j = 0; j < addressingMode.length; j++) {
				Platform.AddInstruction(instructions[i], { addressingMode: addressingMode[j], opCode: [0xCB + (opCode << 8)], opCodeLength: [2] });
				opCode++;
			}
		}
		opCode = 0x40;
		instructions = ["BIT", "RES", "SET"];
		for (let i = 0; i < instructions.length; i++) {
			for (let j = 0; j < 8; j++) {
				for (let k = 0; k < addressingMode.length; k++) {
					Platform.AddInstruction(instructions[i], { addressingMode: `${j},${addressingMode[k]}`, opCode: [0xCB + (opCode << 8)], opCodeLength: [2] });
					opCode++;
				}
			}
		}

		// ********** ED **********
		this.AddSerialsAddMode("IN", ["B,(C)", "C,(C)", "D,(C)", "E,(C)", "H,(C)", "L,(C)", "(C)", "A,(C)"], 0xED + (0x40 << 8), 0, 0x800);
		this.AddSerialsAddMode("OUT", ["(C),B", "(C),C", "(C),D", "(C),E", "(C),H", "(C),L", "(C),0", "(C),A"], 0xED + (0x41 << 8), 0, 0x800);
		this.AddSerialsAddMode("SBC", ["HL,BC", "HL,DE", "HL,HL", "HL,SP"], 0xED + (0x42 << 8), 0, 0x1000);
		this.AddSerialsAddMode("LD", ["([exp]),BC", "([exp]),DE", "([exp]),HL", "([exp]),SP"], 0xED + (0x43 << 8), 2, 0x1000);
		Platform.AddInstruction("NEG", { opCode: [0xED + (0x44 << 8)] });
		Platform.AddInstruction("RETN", { opCode: [0xED + (0x45 << 8)] });
		this.AddSerialsAddMode("IM", ["0", "1"], 0xED + (0x46 << 8), 2, 0x1000);
		Platform.AddInstruction("IM", { addressingMode: "2", opCode: [0xED + (0x5E << 8)] });
		this.AddSerialsAddMode("LD", ["I,A", "R,A", "A,I", "A,R"], 0xED + (0x47 << 8), 2, 0x800);
		Platform.AddInstruction("RRD", { opCode: [0xED + (0x67 << 8)] });
		Platform.AddInstruction("RETI", { opCode: [0xED + (0x4D << 8)] });
		Platform.AddInstruction("RLD", { opCode: [0xED + (0x6F << 8)] });

		addressingMode = ["I", "D", "IR", "DR"];
		opCode = 0xA0;
		for (let j = 0; j < addressingMode.length; j++) {
			Platform.AddInstruction(`LD${addressingMode[j]}`, { opCode: [0xED + (opCode << 8)] });
			Platform.AddInstruction(`CP${addressingMode[j]}`, { opCode: [0xED + (opCode + 1 << 8)] });
			Platform.AddInstruction(`IN${addressingMode[j]}`, { opCode: [0xED + (opCode + 2 << 8)] });
			Platform.AddInstruction(`OUT${addressingMode[j]}`, { opCode: [0xED + (opCode + 3 << 8)] });
			opCode += 0x8;
		}

		// ********** DD FD **********
		this.AddDDAndFD("ADD", "IX,BC", 0x09, 0);			// 0x09
		this.AddDDAndFD("ADD", "IX,DE", 0x19, 0);			// 0x19
		this.AddDDAndFD("LD", "IX,[exp]", 0x20, 2);			// 0x20
		this.AddDDAndFD("LD", "([exp]),IX", 0x21, 2);		// 0x21
		this.AddDDAndFD("INC", "IX", 0x22, 0);
		this.AddDDAndFD("INC", "IXh", 0x23, 0);
		this.AddDDAndFD("DEC", "IXh", 0x24, 0);
		this.AddDDAndFD("LD", "IXh,[exp]", 0x24, 1);
		this.AddDDAndFD("ADD", "IX,IX", 0x28, 0);
		this.AddDDAndFD("LD", "IX,([exp])", 0x29, 2);
		this.AddDDAndFD("DEC", "IX", 0x2A, 0);
		this.AddDDAndFD("INC", "IXI", 0x2B, 0);
		this.AddDDAndFD("DEC", "IXI", 0x2C, 0);
		this.AddDDAndFD("LD", "IXI,[exp]", 0x2D, 0);
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

	private AddSerialsAddMode(ins: string, addrs: string[], start: number, addrLength: number, offset: number) {
		for (let i = 0; i < addrs.length; i++) {
			const temp: number[] = [];
			temp[addrLength] = start;
			Platform.AddInstruction(ins, { addressingMode: addrs[i], opCode: temp });
			start += offset;
		}
	}

	private SpecialJR(option: CompileOption) {
		const line = option.GetCurrent<InstructionLine>();
		const tempValue = ExpressionUtils.GetValue(line.expressions[0].parts, option);
		if (!tempValue.success) {
			line.lineResult.result.length = 2;
			return;
		}

		const temp = tempValue.value - line.lineResult.address.org - 2;
		if (temp > 127 || temp < -128) {
			line.lineType = LineType.Error;
			const errorMsg = Localization.GetMessage("Argument out of range");
			MyDiagnostic.PushException(line.instruction, errorMsg);
			return;
		}

		line.lineResult.SetResult(line.addressMode.opCode[0]!, 0, 1);
		line.lineResult.SetResult(temp & 0xFF, 1, 1);
		line.lineType = LineType.Finished;
	}

	private AddDDAndFD(ins: string, addr: string, opCodeLow: number, addrLength: number) {
		let temp: number[] = [];
		temp[addrLength] = 0xDD + (opCodeLow << 8);
		Platform.AddInstruction(ins, { addressingMode: addr, opCode: temp, });
		addr = addr.replace(/IX/g, "IY");

		temp = [];
		temp[addrLength] = 0xFD + (opCodeLow << 8);
		Platform.AddInstruction(ins, { addressingMode: addr, opCode: temp, });
	}
}