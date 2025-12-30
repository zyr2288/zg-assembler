// gbc的汇编指令
import { CompileOption } from "../Base/CompileOption";
import { ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Localization } from "../I18n/Localization";
import { LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { IAsmPlatform } from "./IAsmPlatform";
import { AddInstructionOption, Platform } from "./Platform";

/**
 * SM83-GBC汇编
 * 
 * https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 */
export class AsmSM83_GBC implements IAsmPlatform {
	platformName: string = "SM83-gbc";

	constructor() {
		this.Initialize();
	}

	private Initialize() {
		let instruction, opCode, addrType;

		// ===== 单指令操作 =====
		this.AddInstructionSeries1({
			NOP: 0x00, STOP: 0x10, HALT: 0x76, DI: 0xF3, EI: 0xFB,
			RLCA: 0x07, RLA: 0x17, DAA: 0x27, SCF: 0x37,
			RRCA: 0x0F, RRA: 0x1F, CPL: 0x2F, CCF: 0x3F,
			RET: 0xC9, RETI: 0xD9,
		});

		// ===== LD =====
		addrType = ["B", "C", "D", "E", "H", "L", "(HL)", "A"];
		opCode = 0x40;
		for (let i = 0; i < addrType.length; i++) {
			for (let j = 0; j < addrType.length; j++) {

				if (addrType[i] === "(HL)" && addrType[j] === "(HL)")
					continue;

				Platform.AddInstruction("LD", { addressingMode: `${addrType[i]},${addrType[j]}`, opCode: [opCode] });
				opCode++;
			}
		}

		Platform.AddInstruction("LD", { addressingMode: "HL,SP+e", opCode: [0xF8] });
		Platform.AddInstruction("LD", { addressingMode: "SP,HL", opCode: [0xf9] });

		this.AddInstructionSeries2("LD", ["(BC),A", "(DE),A", "(HL+),A", "(HL-),A"], 0x02, 0, 0x10);
		this.AddInstructionSeries2("LD", ["A,(BC)", "A,(DE)", "A,(HL+)", "A,(HL-)"], 0x0A, 0, 0x10);

		Platform.AddInstruction("LD", { addressingMode: "([exp]),SP", opCode: [, , 0x08] });
		this.AddInstructionSeries2("LD", ["BC,[exp]", "DE,[exp]", "HL,[exp]", "SP,[exp]"], 0x01, 2, 0x10);
		this.AddInstructionSeries2("LD", ["B,[exp]", "D,[exp]", "H,[exp]", "(HL),[exp]"], 0x06, 1, 0x10);
		this.AddInstructionSeries2("LD", ["([exp]),A", "A,([exp])"], 0xEA, 2, 0x10);
		this.AddInstructionSeries2("LD", ["C,[exp]", "E,[exp]", "L,[exp]", "A,[exp]"], 0x0E, 1, 0x10);

		// ===== INC =====
		this.AddInstructionSeries2("INC", ["BC", "DE", "HL", "SP"], 0x03, 0, 0x10);
		this.AddInstructionSeries2("INC", ["B", "D", "H", "(HL)"], 0x04, 0, 0x10);
		this.AddInstructionSeries2("INC", ["C", "E", "L", "A"], 0x0C, 0, 0x10);

		// ==== DEC =====
		this.AddInstructionSeries2("DEC", ["B", "D", "H", "(HL)"], 0x05, 0, 0x10);
		this.AddInstructionSeries2("DEC", ["BC", "DE", "HL", "SP"], 0x0B, 0, 0x10);
		this.AddInstructionSeries2("DEC", ["C", "E", "L", "A"], 0x0D, 0, 0x10);

		// ===== JR =====
		this.AddInstructionSeries2("JR", ["NZ,[exp]", "NC,[exp]"], 0x20, 0, 0x10, this.SpecialJR);
		this.AddInstructionSeries2("JR", ["C,[exp]", "Z,[exp]", "[exp]"], 0x38, 1, -0x10, this.SpecialJR);

		// 这个必须放这里，否则解析有误
		this.AddInstructionSeries2("ADD", ["HL,BC", "HL,DE", "HL,HL", "HL,SP"], 0x09, 0, 0x10);

		instruction = ["ADD", "ADC", "SUB", "SBC", "AND", "XOR", "OR", "CP"];
		addrType = ["B", "C", "D", "E", "H", "L", "(HL)", "A"];
		opCode = 0x80
		for (let i = 0; i < instruction.length; i++) {
			for (let j = 0; j < addrType.length; j++) {
				Platform.AddInstruction(instruction[i], { addressingMode: addrType[j], opCode: [opCode] })
				opCode++;
			}
		}

		// ===== ADD =====
		Platform.AddInstruction("ADD", { addressingMode: "SP,[exp]", opCode: [0xE8] });
		Platform.AddInstruction("ADD", { addressingMode: "A,[exp]", opCode: [, 0xC6] });

		// ===== 散装运算符 =====
		Platform.AddInstruction("ADD", { addressingMode: "[exp]", opCode: [, 0xC6] });
		Platform.AddInstruction("SUB", { addressingMode: "[exp]", opCode: [, 0xD6] });
		Platform.AddInstruction("AND", { addressingMode: "[exp]", opCode: [, 0xE6] });
		Platform.AddInstruction("OR", { addressingMode: "[exp]", opCode: [, 0xF6] });

		Platform.AddInstruction("ADC", { addressingMode: "[exp]", opCode: [, 0xCE] });
		Platform.AddInstruction("SBC", { addressingMode: "[exp]", opCode: [, 0xDE] });
		Platform.AddInstruction("XOR", { addressingMode: "[exp]", opCode: [, 0xEE] });
		Platform.AddInstruction("CP", { addressingMode: "[exp]", opCode: [, 0xFE] });

		// ===== RET =====
		this.AddInstructionSeries2("RET", ["NZ", "NC"], 0xC0, 0, 0x10);
		this.AddInstructionSeries2("RET", ["Z", "C"], 0xC8, 0, 0x10);

		// ===== LDH =====
		this.AddInstructionSeries2("LDH", ["(C),A", "A,(C)"], 0xE2, 1, 0x10);
		this.AddInstructionSeries2("LDH", ["([exp]),A", "A,([exp])"], 0xE0, 1, 0x10);

		// ===== JP =====
		Platform.AddInstruction("JP", { addressingMode: "HL", opCode: [0xE9] });
		this.AddInstructionSeries2("JP", ["NZ,([exp])", "NC,([exp])"], 0xC2, 2, 0x10);
		this.AddInstructionSeries2("JP", ["Z,[exp]", "C,[exp]"], 0xCA, 2, 0x10);
		Platform.AddInstruction("JP", { addressingMode: "[exp]", opCode: [, , 0xC3] });

		// ===== CALL =====
		this.AddInstructionSeries2("CALL", ["NZ,[exp]", "NC,[exp]"], 0xC4, 1, 0x10);
		this.AddInstructionSeries2("CALL", ["Z,[exp]", "C,[exp]"], 0xC4, 2, 0x10);
		Platform.AddInstruction("CALL", { addressingMode: "[exp]", opCode: [, , 0xCD] });

		// ===== PUSH POP =====
		this.AddInstructionSeries2("POP", ["BC", "DE", "HL", "AF"], 0xC1, 0, 0x10);
		this.AddInstructionSeries2("PUSH", ["BC", "DE", "HL", "AF"], 0xC5, 0, 0x10);

		// ===== RST =====
		this.AddInstructionSeries2("RST", ["0x00", "0x10", "0x20", "0x30"], 0xC7, 0, 0x10);
		this.AddInstructionSeries2("RST", ["0x08", "0x18", "0x28", "0x38"], 0xCF, 0, 0x10);

		// ===== CB op =====
		instruction = ["RLC", "RRC", "RL", "RR", "SLA", "SRA", "SWAP", "SRL"];
		addrType = ["B", "C", "D", "E", "H", "L", "(HL)", "A"];
		opCode = 0x00;
		for (let i = 0; i < instruction.length; i++) {
			for (let j = 0; j < addrType.length; j++) {
				Platform.AddInstruction(instruction[i], { addressingMode: addrType[j], opCode: [0xCB + (opCode << 8)], opCodeLength: [2] });
				opCode++;
			}
		}
		opCode = 0x40;
		instruction = ["BIT", "RES", "SET"];
		for (let i = 0; i < instruction.length; i++) {
			for (let j = 0; j < 8; j++) {
				for (let k = 0; k < addrType.length; k++) {
					Platform.AddInstruction(instruction[i], { addressingMode: `${j},${addrType[k]}`, opCode: [0xCB + (opCode << 8)], opCodeLength: [2] });
					opCode++;
				}
			}
		}
	}
	private AddInstructionSeries1(insAndOpCode: Record<string, number>) {
		for (const key in insAndOpCode)
			Platform.AddInstruction(key, { opCode: [insAndOpCode[key]] });
	}

	private AddInstructionSeries2(instruction: string, addrTypes: string[], startOpCode: number, opCodeLength: number, step: number, spProcess?: AddInstructionOption["spProcess"]) {
		let opCode: number[];
		for (let i = 0; i < addrTypes.length; i++) {
			opCode = [];
			opCode[opCodeLength] = startOpCode;
			Platform.AddInstruction(instruction, { addressingMode: addrTypes[i], opCode, spProcess });
			startOpCode += step;
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
}