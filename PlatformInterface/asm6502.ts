import { IInstructionBase } from "./IInstructionBase";

const asm6502_AddressType = {
	/**单操作，PHP，TAX等 */
	Implied: { index: 0, min: 0 },
	/**立即数操作，CMP #$XX等 */
	Immediate: { index: 1, min: 1 },
	/**绝对寻址 */
	Absolute: { index: 2, min: 2 },
	/**绝对寻址X偏转 */
	AbsoluteX: { index: 3, min: 2 },
	/**绝对寻址Y偏转 */
	AbsoluteY: { index: 4, min: 2 },
	/**零页寻址 */
	ZeroPage: { index: 5, min: 1 },
	/**零页寻址X偏转 */
	ZeroPageX: { index: 6, min: 1 },
	/**零页寻址Y偏转 */
	ZeroPageY: { index: 7, min: 1 },
	/**相对寻址，6C等 */
	Indirect: { index: 8, min: 2 },
	/**相对寻址X偏转 */
	IndirectX: { index: 9, min: 1 },
	/**相对寻址Y偏转 */
	IndirectY: { index: 10, min: 1 },
	/**比较BCC等 */
	Conditional: { index: 11, min: 1 }
}

export class Asm6502 extends IInstructionBase<typeof asm6502_AddressType> {

	constructor() {
		super();
		this.InitAddressType();
		this.AddBaseInstructions();
	}

	/***** Private *****/

	//#region 添加基础寻址方式
	private InitAddressType() {
		this.AddAddressType({ matchType: ["Implied"], start: /^$/ });
		this.AddAddressType({ matchType: ["Immediate"], start: /^#/ });
		this.AddAddressType({ matchType: ["IndirectX"], start: /^\(/, end: /\,\s*[xX]\s*\)/ });
		this.AddAddressType({ matchType: ["IndirectY"], start: /^\(/, end: /\)\s*\,\s*[yY]$/ });
		this.AddAddressType({ matchType: ["ZeroPageX", "AbsoluteX"], end: /\,\s*[xX]$/ });
		this.AddAddressType({ matchType: ["ZeroPageY", "AbsoluteY"], end: /\,\s*[yY]$/ });
		this.AddAddressType({ matchType: ["Indirect"], start: /^\(/, end: /\)$/ });
		this.AddAddressType({ matchType: ["ZeroPage", "Absolute", "Conditional"], start: /^/ });
	}
	//#endregion 添加基础寻址方式

	//#region 添加基础指令
	/**
	 * 添加基础指令
	 */
	private AddBaseInstructions(): void {
		this.AddInstruction("LDA", [
			0xA9, "Immediate",
			0xAD, "Absolute", 0xBD, "AbsoluteX", 0xB9, "AbsoluteY",
			0xA5, "ZeroPage", 0xB5, "ZeroPageX",
			0xA1, "IndirectX", 0xB1, "IndirectY"]);
		this.AddInstruction("LDX", [
			0xA2, "Immediate",
			0xAE, "Absolute", 0xBE, "AbsoluteY",
			0xA6, "ZeroPage", 0xB6, "ZeroPageY"]);
		this.AddInstruction("LDY", [
			0xA0, "Immediate",
			0xAC, "Absolute", 0xBC, "AbsoluteX",
			0xA4, "ZeroPage", 0xB4, "ZeroPageX"]);
		this.AddInstruction("STA", [
			0x8D, "Absolute", 0x9D, "AbsoluteX", 0x99, "AbsoluteY",
			0x85, "ZeroPage", 0x95, "ZeroPageX",
			0x81, "IndirectX", 0x91, "IndirectY"]);
		this.AddInstruction("STX", [
			0x8E, "Absolute",
			0x86, "ZeroPage", 0x96, "ZeroPageY"]);
		this.AddInstruction("STY", [
			0x8C, "Absolute",
			0x84, "ZeroPage", 0x94, "ZeroPageX"]);

		this.AddInstruction("TXA", [0x8A, "Implied"]);
		this.AddInstruction("TAX", [0xAA, "Implied"]);
		this.AddInstruction("TYA", [0x98, "Implied"]);
		this.AddInstruction("TAY", [0xA8, "Implied"]);
		this.AddInstruction("TXS", [0x9A, "Implied"]);
		this.AddInstruction("TSX", [0xBA, "Implied"]);

		this.AddInstruction("ADC", [
			0x69, "Immediate",
			0x6D, "Absolute", 0x7D, "AbsoluteX", 0x79, "AbsoluteY",
			0x65, "ZeroPage", 0x75, "ZeroPageX",
			0x61, "IndirectX", 0x71, "IndirectY"]);
		this.AddInstruction("SBC", [
			0xE9, "Immediate",
			0xED, "Absolute", 0xFD, "AbsoluteX", 0xF9, "AbsoluteY",
			0xE5, "ZeroPage", 0xF5, "ZeroPageX",
			0xE1, "IndirectX", 0xF1, "IndirectY"]);
		this.AddInstruction("INC", [
			0xEE, "Absolute", 0xFE, "AbsoluteX",
			0xE6, "ZeroPage", 0xF6, "ZeroPageX"]);
		this.AddInstruction("DEC", [
			0xCE, "Absolute", 0xDE, "AbsoluteX",
			0xC6, "ZeroPage", 0xD6, "ZeroPageX"]);
		this.AddInstruction("INX", [0xE8, "Implied"]);
		this.AddInstruction("DEX", [0xCA, "Implied"]);
		this.AddInstruction("INY", [0xC8, "Implied"]);
		this.AddInstruction("DEY", [0x88, "Implied"]);

		this.AddInstruction("AND", [
			0x29, "Immediate",
			0x2D, "Absolute", 0x3D, "AbsoluteX", 0x39, "AbsoluteY",
			0x25, "ZeroPage", 0x35, "ZeroPageX",
			0x21, "IndirectX", 0x31, "IndirectY"]);
		this.AddInstruction("ORA", [
			0x09, "Immediate",
			0x0D, "Absolute", 0x1D, "AbsoluteX", 0x19, "AbsoluteY",
			0x05, "ZeroPage", 0x15, "ZeroPageX",
			0x01, "IndirectX", 0x11, "IndirectY"]);
		this.AddInstruction("EOR", [
			0x49, "Immediate",
			0x4D, "Absolute", 0x5D, "AbsoluteX", 0x59, "AbsoluteY",
			0x45, "ZeroPage", 0x55, "ZeroPageX",
			0x41, "IndirectX", 0x51, "IndirectY"]);

		this.AddInstruction("CLC", [0x18, "Implied"]);
		this.AddInstruction("SEC", [0x38, "Implied"]);
		this.AddInstruction("CLD", [0xD8, "Implied"]);
		this.AddInstruction("SED", [0xF8, "Implied"]);
		this.AddInstruction("CLV", [0xB8, "Implied"]);
		this.AddInstruction("CLI", [0x58, "Implied"]);
		this.AddInstruction("SEI", [0x78, "Implied"]);

		this.AddInstruction("CMP", [
			0xC9, "Immediate",
			0xCD, "Absolute", 0xDD, "AbsoluteX", 0xD9, "AbsoluteY",
			0xC5, "ZeroPage", 0xD5, "ZeroPageX",
			0xC1, "IndirectX", 0xD1, "IndirectY"]);
		this.AddInstruction("CPX", [0xE0, "Immediate", 0xEC, "Absolute", 0xE4, "ZeroPage"]);
		this.AddInstruction("CPY", [0xC0, "Immediate", 0xCC, "Absolute", 0xC4, "ZeroPage"]);
		this.AddInstruction("BIT", [0x2C, "Absolute", 0x24, "ZeroPage"]);

		this.AddInstruction("ASL", [
			0x0A, "Implied",
			0x0E, "Absolute", 0x1E, "AbsoluteX",
			0x06, "ZeroPage", 0x16, "ZeroPageX"]);
		this.AddInstruction("LSR", [
			0x4A, "Implied",
			0x4E, "Absolute", 0x5E, "AbsoluteX",
			0x46, "ZeroPage", 0x56, "ZeroPageX"]);
		this.AddInstruction("ROL", [
			0x2A, "Implied",
			0x2E, "Absolute", 0x3E, "AbsoluteX",
			0x26, "ZeroPage", 0x36, "ZeroPageX"]);
		this.AddInstruction("ROR", [
			0x6A, "Implied",
			0x6E, "Absolute", 0x7E, "AbsoluteX",
			0x66, "ZeroPage", 0x76, "ZeroPageX"]);

		this.AddInstruction("PHA", [0x48, "Implied"]);
		this.AddInstruction("PLA", [0x68, "Implied"]);
		this.AddInstruction("PHP", [0x08, "Implied"]);
		this.AddInstruction("PLP", [0x28, "Implied"]);

		this.AddInstruction("JMP", [0x4C, "Absolute", 0x6C, "Indirect"]);
		this.AddInstruction("JSR", [0x20, "Absolute"]);
		this.AddInstruction("NOP", [0xEA, "Implied"]);

		this.AddInstruction("BEQ", [0xF0, "Conditional"]);
		this.AddInstruction("BNE", [0xD0, "Conditional"]);
		this.AddInstruction("BCS", [0xB0, "Conditional"]);
		this.AddInstruction("BCC", [0x90, "Conditional"]);
		this.AddInstruction("BMI", [0x30, "Conditional"]);
		this.AddInstruction("BPL", [0x10, "Conditional"]);
		this.AddInstruction("BVS", [0x70, "Conditional"]);
		this.AddInstruction("BVC", [0x50, "Conditional"]);

		this.AddInstruction("RTS", [0x60, "Implied"]);
		this.AddInstruction("RTI", [0x40, "Implied"]);
		this.AddInstruction("BRK", [0x00, "Implied"]);
	}
	//#endregion 添加基础指令


}