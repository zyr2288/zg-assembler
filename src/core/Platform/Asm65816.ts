import { BaseLineUtils } from "../BaseLine/BaseLine";
import { CommonOption } from "../Base/CommonOption";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { LexerUtils, LexPart } from "../Utils/LexerUtils";
import { Utils } from "../Utils/Utils";
import { InstructionBase } from "./InstructionBase";
import { InstructionLine } from "../BaseLine/InstructionLine";

const asm65816_AddressType = {
	/**立即数操作，CMP #$XX等 */
	Immediate: { index: 0, min: 1, max: 2 },
	/**立即数操作，短 */
	ImmediateShort: { index: 1, min: 1 },
	/**立即数操作，长 */
	ImmediateLong: { index: 2, min: 2 },

	/**绝对寻址 */
	Absolute: { index: 3, min: 2 },
	/**绝对长程寻址 */
	AbsoluteLong: { index: 4, min: 3 },
	/**绝对变址X寻址 */
	AbsoluteX: { index: 5, min: 2 },
	/**绝对变址X长程寻址 */
	AbsoluteXLong: { index: 6, min: 3 },
	/**绝对变址Y寻址 */
	AbsoluteY: { index: 7, min: 2 },
	/**绝对变址间接寻址 */
	AbsoluteIndirect: { index: 8, min: 2 },
	/**绝对间接长程寻址 */
	AbsoluteIndirectLong: { index: 9, min: 2 },

	/**直接页面寻址 */
	Page: { index: 10, min: 1 },
	/**直接页面间接寻址 */
	PageIndirect: { index: 11, min: 1 },
	/**直接页面间接长程寻址 */
	PageIndirectLong: { index: 12, min: 1 },
	/**直接页面变址X寻址 */
	PageX: { index: 13, min: 1 },
	/**直接页面变址X，间接寻址 */
	PageIndirectX: { index: 14, min: 1 },
	/**直接页面间接，变址Y寻址 */
	PageIndirectY: { index: 15, min: 1 },
	/**直接页面间接长程，变址Y寻址 */
	PageIndirectYLong: { index: 16, min: 1 },
	/**直接页面变址Y寻址 */
	PageY: { index: 17, min: 1 },

	/**堆栈相对寻址 */
	Stack: { index: 18, min: 1 },
	/**堆栈相对间接，变址Y寻址 */
	StackY: { index: 19, min: 1 },

	/**单操作，ASL, PHP等 */
	Implied: { index: 20, min: 0 },

	/**跳转指令，短 */
	Conditional: { index: 21, min: 1 },

	/**区段移动, MVN, MVP */
	BlockMove: { index: 22, min: 2 }
}

export class Asm65816 extends InstructionBase<typeof asm65816_AddressType> {

	constructor() {
		super();
		this.baseAddressType = asm65816_AddressType;
		this.InitAddressType();
		this.AddBaseInstructions();

		this.UpdateRegexStr();
	}

	//#region 添加寻址方式
	private InitAddressType(): void {
		// LDA
		this.AddAddressType({ matchType: ["Implied"], start: /^$/ });
		// LDA #??
		this.AddAddressType({ matchType: ["ImmediateLong"], start: /^##/ });
		// LDA #??
		this.AddAddressType({ matchType: ["Immediate", "ImmediateShort", "ImmediateLong"], start: /^#/ });
		// LDA ??,S					
		this.AddAddressType({ matchType: ["Stack"], end: /\,\s*[sS]$/ });
		// LDA (??,S),Y
		this.AddAddressType({ matchType: ["StackY"], start: /^\(/, end: /\,\s*[sS]\s*\)\s*\,\s*[yY]$/ });
		// LDA (????,X)
		this.AddAddressType({ matchType: ["AbsoluteIndirect"], start: /^\(/, end: /\,\s*[xX]\s*\)$/ });
		// LDA (????),Y
		this.AddAddressType({ matchType: ["PageIndirectY"], start: /^\(/, end: /\)\s*\,\s*[yY]$/ });
		// LDA (???)
		this.AddAddressType({ matchType: ["PageIndirect", "AbsoluteIndirect", "AbsoluteIndirectLong"], start: /^\(/, end: /\)$/ });
		// LDA [???]
		this.AddAddressType({ matchType: ["PageIndirectLong"], start: /^\[/, end: /\]$/ });
		// LDA [???],Y
		this.AddAddressType({ matchType: ["PageIndirectYLong"], start: /^\[/, end: /\]\s*\,\s*[yY]$/ });
		// LDA ????,X
		this.AddAddressType({ matchType: ["PageX", "AbsoluteX", "AbsoluteXLong"], end: /\,\s*[xX]$/ });
		// LDA ????,Y
		this.AddAddressType({ matchType: ["PageY", "AbsoluteY"], end: /\,\s*[yY]$/ });
		// 其它
		this.AddAddressType({ matchType: ["Page", "Absolute", "AbsoluteLong", "Conditional", "BlockMove"], start: /^/ });
	}
	//#endregion 添加寻址方式

	//#region 添加基础寻址方式
	private AddBaseInstructions(): void {
		this.AddInstruction("ADC", [
			0x69, "Immediate", 0x69, "ImmediateLong",
			0x6D, "Absolute", 0x6F, "AbsoluteLong", 0x7D, "AbsoluteX", 0x7F, "AbsoluteXLong", 0x79, "AbsoluteY",
			0x65, "Page", 0x75, "PageX", 0x72, "PageIndirect", 0x67, "PageIndirectLong", 0x61, "PageIndirectX", 0x71, "PageIndirectY", 0x77, "PageIndirectYLong",
			0x63, "Stack", 0x73, "StackY"]);
		this.AddInstruction("AND", [
			0x29, "Immediate", 0x29, "ImmediateLong",
			0x2D, "Absolute", 0x2F, "AbsoluteLong",
			0x25, "Page", 0x35, "PageX", 0x32, "PageIndirect", 0x27, "PageIndirectLong", 0x21, "PageIndirectX", 0x31, "PageIndirectY", 0x37, "PageIndirectYLong",
			0x3D, "AbsoluteX", 0x3F, "AbsoluteXLong", 0x39, "AbsoluteY",
			0x23, "Stack", 0x33, "StackY"]);
		this.AddInstruction("ASL", [
			0x0A, "Implied",
			0x0E, "Absolute", 0x1E, "AbsoluteX",
			0x06, "Page", 0x16, "PageX",]);
		this.AddInstruction("BCC", [0x90, "Conditional"]);
		this.AddInstruction("BCS", [0xB0, "Conditional"]);
		this.AddInstruction("BEQ", [0xF0, "Conditional"]);
		this.AddInstruction("BNE", [0xD0, "Conditional"]);
		this.AddInstruction("BMI", [0x30, "Conditional"]);
		this.AddInstruction("BPL", [0x10, "Conditional"]);
		this.AddInstruction("BVC", [0x50, "Conditional"]);
		this.AddInstruction("BVS", [0x70, "Conditional"]);
		this.AddInstruction("BRA", [0x80, "Conditional"]);
		this.AddInstruction("BRL", [0x82, "Conditional"]);
		this.BindFunction({ compile: this.Compile_Condition }, "BCC", "BCS", "BEQ", "BNE", "BMI", "BPL", "BVC", "BVS", "BRA", "BRL");

		this.AddInstruction("BIT", [
			0x89, "Immediate", 0x89, "ImmediateLong",
			0x2C, "Absolute", 0x3C, "AbsoluteX",
			0x24, "Page", 0x34, "PageX"]);
		this.AddInstruction("BRK", [0x00, "Implied", 0x00, "ImmediateShort"]);
		this.AddInstruction("CLC", [0x18, "Implied"]);
		this.AddInstruction("CLD", [0xD8, "Implied"]);
		this.AddInstruction("CLI", [0x58, "Implied"]);
		this.AddInstruction("CLV", [0xB8, "Implied"]);
		this.AddInstruction("SEC", [0x38, "Implied"]);
		this.AddInstruction("SED", [0xF8, "Implied"]);
		this.AddInstruction("SEI", [0x78, "Implied"]);
		this.AddInstruction("CMP", [
			0xC9, "Immediate", 0xC9, "ImmediateLong",
			0xCD, "Absolute", 0xCF, "AbsoluteLong", 0xDD, "AbsoluteX", 0xDF, "AbsoluteXLong", 0xD9, "AbsoluteY",
			0xC5, "Page", 0xD5, "PageX", 0xD2, "PageIndirect", 0xC7, "PageIndirectLong", 0xC1, "PageIndirectX", 0xD1, "PageIndirectY", 0xD7, "PageIndirectYLong",
			0xC3, "Stack", 0xD3, "StackY"]);
		this.AddInstruction("COP", [0x02, "ImmediateShort"]);
		this.AddInstruction("CPX", [0xE0, "Immediate", 0xE0, "ImmediateLong", 0xEC, "Absolute", 0xE4, "Page"]);
		this.AddInstruction("CPY", [0xC0, "Immediate", 0xC0, "ImmediateLong", 0xCC, "Absolute", 0xC4, "Page"]);
		this.AddInstruction("DEC", [
			0x3A, "Implied",
			0xCE, "Absolute", 0xDE, "AbsoluteX",
			0xC6, "Page", 0xD6, "PageX"]);
		this.AddInstruction("DEX", [0xCA, "Implied"]);
		this.AddInstruction("DEY", [0x88, "Implied"]);
		this.AddInstruction("EOR", [
			0x49, "Immediate", 0x49, "ImmediateLong",
			0x4D, "Absolute", 0x4F, "AbsoluteLong", 0x5D, "AbsoluteX", 0x5F, "AbsoluteXLong", 0x59, "AbsoluteY",
			0x45, "Page", 0x52, "PageIndirect", 0x47, "PageIndirectLong", 0x55, "PageX", 0x41, "PageIndirectX", 0x51, "PageIndirectY", 0x57, "PageIndirectYLong",
			0x43, "Stack", 0x53, "StackY"]);
		this.AddInstruction("INC", [
			0x1A, "Implied",
			0xEE, "Absolute", 0xFE, "AbsoluteX",
			0xE6, "Page", 0xF6, "PageX"]);
		this.AddInstruction("INX", [0xE8, "Implied"]);
		this.AddInstruction("INY", [0xC8, "Implied"]);
		this.AddInstruction("JMP", [
			0x4C, "Absolute", 0x5C, "AbsoluteLong", 0x7C, "AbsoluteIndirect", 0xDC, "AbsoluteIndirectLong",
			0x62, "PageIndirect"]);
		this.AddInstruction("JSR", [0x20, "Absolute", 0xFC, "AbsoluteIndirect"]);
		this.AddInstruction("JSL", [0x22, "AbsoluteLong",]);
		this.AddInstruction("LDA", [
			0xA9, "Immediate", 0xA9, "ImmediateLong",
			0xAD, "Absolute", 0xAF, "AbsoluteLong", 0xBD, "AbsoluteX", 0xBF, "AbsoluteXLong", 0xB9, "AbsoluteY",
			0xA5, "Page", 0xB5, "PageX", 0xB2, "PageIndirect", 0xA7, "PageIndirectLong", 0xA1, "PageIndirectX", 0xB1, "PageIndirectY", 0xB7, "PageIndirectYLong",
			0xA3, "Stack", 0xB3, "StackY"]);
		this.AddInstruction("LDX", [
			0xA2, "Immediate", 0xA2, "ImmediateLong",
			0xAE, "Absolute", 0xBE, "AbsoluteY",
			0xA6, "Page", 0xB6, "PageY"]);
		this.AddInstruction("LDY", [
			0xA0, "Immediate", 0xA0, "ImmediateLong",
			0xAC, "Absolute", 0xBC, "AbsoluteX",
			0xA4, "Page", 0xB4, "PageX"]);
		this.AddInstruction("LSR", [
			0x4A, "Implied",
			0x4E, "Absolute", 0x5E, "AbsoluteX",
			0x46, "Page", 0x56, "PageX"]);
		this.BindFunction({ firstAnalyse: this.FirstAnalyse_MV, thirdAnalyse: this.ThirdAnalyse_MV, compile: this.Compile_MV }, "MVN", "MVP")

		this.BindFunction({ firstAnalyse: this.FirstAnalyse_MV })

		this.AddInstruction("NOP", [0xEA, "Implied"]);
		this.AddInstruction("ORA", [
			0x09, "Immediate", 0x09, "ImmediateLong",
			0x0D, "Absolute", 0x0F, "AbsoluteLong", 0x1D, "AbsoluteX", 0x1F, "AbsoluteXLong", 0x19, "AbsoluteY",
			0x05, "Page", 0x15, "PageX", 0x12, "PageIndirect", 0x07, "PageIndirectLong", 0x01, "PageIndirectX", 0x11, "PageIndirectY", 0x17, "PageIndirectYLong",
			0x03, "Stack", 0x13, "StackY"]);
		this.AddInstruction("PEA", [0xF4, "ImmediateLong"]);
		this.AddInstruction("PEI", [0xD4, "PageIndirect"]);

		this.AddInstruction("PER", [0x62, "Conditional"]);
		this.BindFunction({ compile: this.Compile_Condition }, "PER");

		this.AddInstruction("PHA", [0x48, "Implied"]);
		this.AddInstruction("PHP", [0x08, "Implied"]);
		this.AddInstruction("PHX", [0xDA, "Implied"]);
		this.AddInstruction("PHY", [0x5A, "Implied"]);
		this.AddInstruction("PLA", [0x68, "Implied"]);
		this.AddInstruction("PLP", [0x28, "Implied"]);
		this.AddInstruction("PLX", [0xFA, "Implied"]);
		this.AddInstruction("PLY", [0x7A, "Implied"]);
		this.AddInstruction("PHB", [0x8B, "Implied"]);
		this.AddInstruction("PHD", [0x0B, "Implied"]);
		this.AddInstruction("PHK", [0x4B, "Implied"]);
		this.AddInstruction("PLB", [0xAB, "Implied"]);
		this.AddInstruction("PLD", [0x2B, "Implied"]);
		this.AddInstruction("REP", [0xC2, "ImmediateShort"]);
		this.AddInstruction("ROL", [
			0x2A, "Implied",
			0x2E, "Absolute", 0x3E, "AbsoluteX",
			0x26, "Page", 0x36, "PageX"]);
		this.AddInstruction("ROR", [
			0x6A, "Implied",
			0x6E, "Absolute", 0x7E, "AbsoluteX",
			0x66, "Page", 0x76, "PageX"]);
		this.AddInstruction("RTI", [0x40, "Implied"]);
		this.AddInstruction("RTL", [0x6B, "Implied"]);
		this.AddInstruction("RTS", [0x60, "Implied"]);
		this.AddInstruction("SBC", [
			0xE9, "Immediate", 0xE9, "ImmediateLong",
			0xED, "Absolute", 0xEF, "AbsoluteLong", 0xFD, "AbsoluteX", 0xFF, "AbsoluteXLong", 0xF9, "AbsoluteY",
			0xE5, "Page", 0xF5, "PageX", 0xF2, "PageIndirect", 0xE7, "PageIndirectLong",
			0xE1, "PageIndirectX", 0xF1, "PageIndirectY", 0xF7, "PageIndirectYLong",
			0xE3, "Stack", 0xF3, "StackY"]);
		this.AddInstruction("SEP", [0xE2, "ImmediateShort"]);
		this.AddInstruction("STA", [
			0x8D, "Absolute", 0x8F, "AbsoluteLong", 0x9D, "AbsoluteX", 0x9F, "AbsoluteXLong", 0x99, "AbsoluteY",
			0x85, "Page", 0x95, "PageX", 0x92, "PageIndirect", 0x87, "PageIndirectYLong", 0x81, "PageIndirectX", 0x91, "PageIndirectY", 0x97, "PageIndirectYLong",
			0x83, "Stack", 0x93, "StackY"]);
		this.AddInstruction("STP", [0xDB, "Implied"]);
		this.AddInstruction("STX", [0x8E, "Absolute", 0x86, "Page", 0x96, "PageY"]);
		this.AddInstruction("STY", [0x8C, "Absolute", 0x84, "Page", 0x94, "PageX"]);
		this.AddInstruction("STZ", [0x9C, "Absolute", 0x64, "Page", 0x9E, "AbsoluteX", 0x74, "PageX"]);
		this.AddInstruction("TAX", [0xAA, "Implied"]);
		this.AddInstruction("TAY", [0xA8, "Implied"]);
		this.AddInstruction("TXA", [0x8A, "Implied"]);
		this.AddInstruction("TYA", [0x98, "Implied"]);
		this.AddInstruction("TSX", [0xBA, "Implied"]);
		this.AddInstruction("TXS", [0x9A, "Implied"]);
		this.AddInstruction("TXY", [0x9B, "Implied"]);
		this.AddInstruction("TYX", [0xBB, "Implied"]);
		this.AddInstruction("TCD", [0x5B, "Implied"]);
		this.AddInstruction("TDC", [0x7B, "Implied"]);
		this.AddInstruction("TCS", [0x1B, "Implied"]);
		this.AddInstruction("TSC", [0x3B, "Implied"]);
		this.AddInstruction("TRB", [0x1C, "Absolute", 0x14, "Page"]);
		this.AddInstruction("TSB", [0x0C, "Absolute", 0x04, "Page"]);
		this.AddInstruction("WAI", [0xCB, "Implied"]);
		this.AddInstruction("WDM", [0x42, "ImmediateShort"]);
		this.AddInstruction("XBA", [0xEB, "Implied"]);
		this.AddInstruction("XCE", [0xFB, "Implied"]);
	}
	//#endregion 添加基础寻址方式

	//#region MVP MVN指令
	/**MVP MVN指令 */
	private FirstAnalyse_MV(option: CommonOption) {
		const line = <InstructionLine>option.allLine[option.lineIndex];
		let types = line.addressType;
		if (!types.includes(asm65816_AddressType.BlockMove.index)) {
			MyException.PushException(line.expression, ErrorType.InstructionNotSupportAddress, ErrorLevel.Show);
			return false;
		}

		let part = line.expression.Split(/\s*\,\s*/g, 1);
		if (part[0].isNull || part[1].isNull) {
			MyException.PushException(line.expression, ErrorType.ArgumentError, ErrorLevel.Show);
			return false;
		}

		let temp1 = LexerUtils.SplitAndSort(part[0]);
		let temp2 = LexerUtils.SplitAndSort(part[1]);
		if (temp1 && temp2)
			line.tag = [temp1, temp2];
		else
			line.errorLine = true;

		return !line.errorLine;
	}

	private ThirdAnalyse_MV(option: CommonOption) {
		const line = <InstructionLine>option.allLine[option.lineIndex];
		let part1: LexPart[] = line.tag[0];
		let part2: LexPart[] = line.tag[1];

		line.expParts.push(...part1);
		line.expParts.push(...part2);

		let temp = LexerUtils.CheckLabelsAndShowError(part1, option);
		line.errorLine = LexerUtils.CheckLabelsAndShowError(part2, option) || temp;
		return !line.errorLine;
	}

	private Compile_MV(option: CommonOption) {
		const line = <InstructionLine>option.allLine[option.lineIndex];

		let part1: LexPart[] = line.tag[0];
		let part2: LexPart[] = line.tag[1];

		let value1 = LexerUtils.GetExpressionValue(part1, "getValue", option);
		let value2 = LexerUtils.GetExpressionValue(part2, "getValue", option);
		if (!value1.success || !value2.success)
			return false;

		if (Utils.DataByteLength(value1.value) > 1 || Utils.DataByteLength(value2.value) > 1) {
			MyException.PushException(line.expression, ErrorType.ArgumentOutofRange, ErrorLevel.Show);
			return false;
		}

		let instruction = this.allInstructions[line.keyword.text].addressPro[asm65816_AddressType.BlockMove.index];
		BaseLineUtils.SetResult(line, instruction.instructionCode, 0, instruction.instructionCodeLength);
		BaseLineUtils.SetResult(line, value2.value, 1, 1);
		BaseLineUtils.SetResult(line, value1.value, 2, 1);
		line.isFinished = true;
		return true;
	}
	//#endregion MVP MVN指令

	//#region 处理条件跳转
	/**
	 * 处理条件跳转
	 * @param baseLine 基础行
	 * @param option 选项
	 * @returns 
	 */
	private Compile_Condition(option: CommonOption) {
		const line = <InstructionLine>option.allLine[option.lineIndex];

		let types = line.addressType;
		if (types.includes(asm65816_AddressType.Conditional.index)) {
			line.result.length = ["BRL", "PER"].includes(line.keyword.text) ? 3 : 2;
		} else {
			MyException.PushException(line.expression, ErrorType.InstructionNotSupportAddress, ErrorLevel.Show);
			return false;
		}

		let result = LexerUtils.GetExpressionValue(line.expParts, "getValue", option);
		if (!result.success) {
			return false;
		}

		let temp: number;
		if (line.result.length == 3) {
			temp = result.value - line.orgAddress - 3;
			if (temp > 32767 || temp < -32768) {
				MyException.PushException(line.expression, ErrorType.ArgumentOutofRange, ErrorLevel.Show);
				return false;
			}
		} else {
			temp = result.value - line.orgAddress - 2;
			if (temp > 127 || temp < -128) {
				MyException.PushException(line.expression, ErrorType.ArgumentOutofRange, ErrorLevel.Show);
				return false;
			}
		}

		line.result[0] = this.allInstructions[line.keyword.text].addressPro[asm65816_AddressType.Conditional.index].instructionCode;
		line.result[1] = temp & 0xFF;
		if (line.result.length == 3) {
			temp >>= 8;
			line.result[2] = temp & 0xFF;
		}
		line.isFinished = true;
		return true;
	}
	//#endregion 处理条件跳转

}
