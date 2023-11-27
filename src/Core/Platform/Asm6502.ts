import { Compiler } from "../Base/Compiler";
import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Localization } from "../I18n/Localization";
import { LineCompileType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { AddressOption, AsmCommon } from "./AsmCommon";

export class Asm6502 {

	static readonly PlatformName = "6502";

	constructor() {
		AsmCommon.allInstructions.clear();
		this.Initialize();
		AsmCommon.UpdateInstructions();
	}

	private Initialize() {

		let instructions = [
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

		for (let i = 0; i < instructions.length; ++i)
			this.AddInstruction(instructions[i], { opCode: [opCode1[i]] });

		instructions = [
			"LDA", "LDX", "LDY", "STA", "STX", "STY",
			"ADC", "SBC", "AND", "EOR", "ORA",
			"CMP", "CPX", "CPY", "BIT",
			"INC", "DEC"
		];

		let addressingMode = [
			"#[exp]", "([exp],X)", "([exp]),Y", "[exp],X", "[exp],Y", "[exp]"
		];

		const opCode2 = [
			//"#[exp]",    "([exp],X)",   "([exp]),Y",   "[exp],X",      "[exp],Y",      "[exp]"                
			[[0xA9], [0xA1], [0xB1], [0xB5, 0xBD], [-1, 0xB9], [0xA5, 0xAD]],             //LDA
			[[0xA2], null, null, null, [0xB6, 0xBE], [0xA6, 0xAE]],             //LDX
			[[0xA0], null, null, [0xB4, 0xBC], null, [0xA4, 0xAC]],             //LDY
			[null, [0x81], [0x91], [0x95, 0x9D], [-1, 0x99], [0x85, 0x8D]],             //STA
			[null, null, null, null, [0x96], [0x86, 0x8E]],             //STX
			[null, null, null, [0x94], null, [0x84, 0x8C]],             //STY
			[[0x69], [0x61], [0x71], [0x75, 0x7D], [-1, 0x79], [0x65, 0x6D]],             //ADC
			[[0xE9], [0xE1], [0xF1], [0xF5, 0xFD], [-1, 0xF9], [0xE5, 0xED]],             //SBC
			[[0x29], [0x21], [0x31], [0x35, 0x3D], [-1, 0x39], [0x25, 0x2D]],             //AND
			[[0x49], [0x41], [0x51], [0x55, 0x5D], [-1, 0x59], [0x45, 0x4D]],             //EOR
			[[0x09], [0x01], [0x11], [0x15, 0x1D], [-1, 0x19], [0x05, 0x0D]],             //ORA
			[[0xC9], [0xC1], [0xD1], [0xD5, 0xDD], [-1, 0xD9], [0xC5, 0xCD]],             //CMP
			[[0xE0], null, null, null, null, [0xE4, 0xEC]],             //CPX
			[[0xC0], null, null, null, null, [0xC4, 0xCC]],             //CPY
			[null, null, null, null, null, [0x24, 0x2C]],             //BIT
			[null, null, null, [0xF6, 0xFE], null, [0xE6, 0xEE]],             //INC
			[null, null, null, [0xD6, 0xDE], null, [0xC6, 0xCE]],             //DEC
		];

		for (let i = 0; i < instructions.length; ++i) {
			const instruction = instructions[i];
			for (let j = 0; j < addressingMode.length; ++j) {
				const adMode = addressingMode[j];
				const opCode = opCode2[i][j];
				if (opCode === null)
					continue;

				let code: number[] = [];
				for (let k = 0; k < opCode.length; ++k) {
					if (opCode[k] === -1)
						continue;

					code[k + 1] = opCode[k];
				}

				this.AddInstruction(instruction, { addressingMode: adMode, opCode: code });
			}
		}

		instructions = ["ASL", "LSR", "ROL", "ROR"];
		const opCode3 = [
			//Empty  [exp],X         [exp]
			[[0x0A], [, 0x16, 0x1E], [, 0x06, 0x0E]],
			[[0x4A], [, 0x56, 0x5E], [, 0x46, 0x4E]],
			[[0x2A], [, 0x36, 0x3E], [, 0x26, 0x2E]],
			[[0x6A], [, 0x76, 0x7E], [, 0x66, 0x6E]],
		]
		for (let i = 0; i < instructions.length; ++i) {
			this.AddInstruction(instructions[i], { opCode: opCode3[i][0] });
			this.AddInstruction(instructions[i], { addressingMode: "[exp],X", opCode: opCode3[i][1] });
			this.AddInstruction(instructions[i], { addressingMode: "[exp]", opCode: opCode3[i][2] });
		}

		this.AddInstruction("JMP", { addressingMode: "([exp])", opCode: [, , 0x6C] });
		this.AddInstruction("JMP", { addressingMode: "[exp]", opCode: [, , 0x4C] });
		this.AddInstruction("JSR", { addressingMode: "[exp]", opCode: [, , 0x20] });

		instructions = ["BPL", "BMI", "BVC", "BVS", "BCC", "BCS", "BNE", "BEQ"];
		const opcode4 = [0x10, 0x30, 0x50, 0x70, 0x90, 0xB0, 0xD0, 0xF0];
		for (let i = 0; i < instructions.length; ++i)
			this.AddInstruction(instructions[i], { addressingMode: "[exp]", opCode: [, opcode4[i]], spProcess: this.ConditionBranch });

	}

	private ConditionBranch(option: DecodeOption) {
		const line = option.GetCurrectLine<InstructionLine>();
		let tryValue = Compiler.isLastCompile ? ExpressionResult.GetResultAndShowError : ExpressionResult.TryToGetResult;
		let tempValue = ExpressionUtils.GetExpressionValue(line.expParts[0], tryValue, option);
		if (!tempValue.success) {
			line.result.length = 2;
			return;
		}

		let temp = tempValue.value - line.orgAddress - 2;
		if (temp > 127 || temp < -128) {
			line.compileType = LineCompileType.Error;
			let errorMsg = Localization.GetMessage("Argument out of range")
			MyDiagnostic.PushException(line.instruction, errorMsg);
			return;
		}

		line.SetResult(line.addressingMode.opCode[1]!, 0, 1);
		line.SetResult(temp & 0xFF, 1, 1);
		// Compiler.SetResult(line, line.addressingMode.opCode[1]!, 0, 1);
		// Compiler.SetResult(line, temp & 0xFF, 1, 1);
		line.compileType = LineCompileType.Finished;
	}

	private AddInstruction(instruction: string, addressingMode: AddressOption) {
		AsmCommon.AddInstructionWithLength(instruction, addressingMode);
	}
}