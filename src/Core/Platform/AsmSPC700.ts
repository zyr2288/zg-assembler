import { ExpressionUtils } from "../Base/ExpressionUtils";
import { Localization } from "../I18n/Localization";
import { InstructionLine } from "../Lines/InstructionLine";
import { IAsmPlatform } from "./IAsmPlatform";
import { CompileOption } from "../Base/CompileOption";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { LineType } from "../Lines/CommonLine";
import { AddInstructionOption, Platform } from "./Platform";

export class AsmSPC700 implements IAsmPlatform {

	platformName = "SPC700";

	constructor() {
		this.Initialize();
	}

	private Initialize() {
		Platform.AddInstruction("ADC", { addressingMode: "(X),(Y)", opCode: [0x99] });
		Platform.AddInstruction("ADC", { addressingMode: "(X)", opCode: [0x86] });
		Platform.AddInstruction("ADC", { addressingMode: "[[exp],X]", opCode: [, 0x87] });
		Platform.AddInstruction("ADC", { addressingMode: "[[exp]],Y", opCode: [, 0x97] });
		Platform.AddInstruction("ADC", { addressingMode: "[exp],X", opCode: [, 0x94, 0x95] });
		Platform.AddInstruction("ADC", { addressingMode: "[exp],Y", opCode: [, , 0x96] });
		Platform.AddInstruction("ADC", { addressingMode: "[exp],#[exp]", opCode: [, , 0x98], spProcess: this.TwoOperands });
		Platform.AddInstruction("ADC", { addressingMode: "[exp],[exp]", opCode: [, , 0x89], spProcess: this.TwoOperands });
		Platform.AddInstruction("ADC", { addressingMode: "#[exp]", opCode: [, 0x88] });
		Platform.AddInstruction("ADC", { addressingMode: "[exp]", opCode: [, 0x84, 0x85] });

		Platform.AddInstruction("ADW", { addressingMode: "[exp]", opCode: [, 0x7A] });

		Platform.AddInstruction("AND", { addressingMode: "(X),(Y)", opCode: [0x39] });
		Platform.AddInstruction("AND", { addressingMode: "(X)", opCode: [0x26] });
		Platform.AddInstruction("AND", { addressingMode: "[[exp],X]", opCode: [, 0x27] });
		Platform.AddInstruction("AND", { addressingMode: "[[exp]],Y", opCode: [, 0x37] });
		Platform.AddInstruction("AND", { addressingMode: "[exp],X", opCode: [, 0x34, 0x35] });
		Platform.AddInstruction("AND", { addressingMode: "[exp],Y", opCode: [, , 0x36] });
		Platform.AddInstruction("AND", { addressingMode: "[exp],#[exp]", opCode: [, , 0x38], spProcess: this.TwoOperands });
		Platform.AddInstruction("AND", { addressingMode: "[exp],[exp]", opCode: [, , 0x29], spProcess: this.TwoOperands });
		Platform.AddInstruction("AND", { addressingMode: "#[exp]", opCode: [, 0x28] });
		Platform.AddInstruction("AND", { addressingMode: "[exp]", opCode: [, 0x24, 25] });


		Platform.AddInstruction("ANDC", { addressingMode: "/[exp].[exp]", opCode: [, , 0x6A], spProcess: this.Bit_15_3 });
		Platform.AddInstruction("ANDC", { addressingMode: "[exp].[exp]", opCode: [, , 0x4A], spProcess: this.Bit_15_3 });

		Platform.AddInstruction("ASL", { addressingMode: "A", opCode: [0x1C] });
		Platform.AddInstruction("ASL", { addressingMode: "[exp],X", opCode: [, 0x1B] });
		Platform.AddInstruction("ASL", { addressingMode: "[exp]", opCode: [, 0x0B, 0x0C] });
		Platform.AddInstruction("ASL", { opCode: [0x1C] });

		Platform.AddInstruction("BBC", { addressingMode: "[exp].0,[exp]", opCode: [, , 0x13], spProcess: this.Branch2 });
		Platform.AddInstruction("BBC", { addressingMode: "[exp].1,[exp]", opCode: [, , 0x33], spProcess: this.Branch2 });
		Platform.AddInstruction("BBC", { addressingMode: "[exp].2,[exp]", opCode: [, , 0x53], spProcess: this.Branch2 });
		Platform.AddInstruction("BBC", { addressingMode: "[exp].3,[exp]", opCode: [, , 0x73], spProcess: this.Branch2 });
		Platform.AddInstruction("BBC", { addressingMode: "[exp].4,[exp]", opCode: [, , 0x93], spProcess: this.Branch2 });
		Platform.AddInstruction("BBC", { addressingMode: "[exp].5,[exp]", opCode: [, , 0xB3], spProcess: this.Branch2 });
		Platform.AddInstruction("BBC", { addressingMode: "[exp].6,[exp]", opCode: [, , 0xD3], spProcess: this.Branch2 });
		Platform.AddInstruction("BBC", { addressingMode: "[exp].7,[exp]", opCode: [, , 0xF3], spProcess: this.Branch2 });

		Platform.AddInstruction("BBS", { addressingMode: "[exp].0,[exp]", opCode: [, , 0x03], spProcess: this.Branch2 });
		Platform.AddInstruction("BBS", { addressingMode: "[exp].1,[exp]", opCode: [, , 0x23], spProcess: this.Branch2 });
		Platform.AddInstruction("BBS", { addressingMode: "[exp].2,[exp]", opCode: [, , 0x43], spProcess: this.Branch2 });
		Platform.AddInstruction("BBS", { addressingMode: "[exp].3,[exp]", opCode: [, , 0x63], spProcess: this.Branch2 });
		Platform.AddInstruction("BBS", { addressingMode: "[exp].4,[exp]", opCode: [, , 0x83], spProcess: this.Branch2 });
		Platform.AddInstruction("BBS", { addressingMode: "[exp].5,[exp]", opCode: [, , 0xA3], spProcess: this.Branch2 });
		Platform.AddInstruction("BBS", { addressingMode: "[exp].6,[exp]", opCode: [, , 0xC3], spProcess: this.Branch2 });
		Platform.AddInstruction("BBS", { addressingMode: "[exp].7,[exp]", opCode: [, , 0xE3], spProcess: this.Branch2 });

		Platform.AddInstruction("BCC", { addressingMode: "[exp]", opCode: [, 0x90], spProcess: this.Branch1 });
		Platform.AddInstruction("BCS", { addressingMode: "[exp]", opCode: [, 0xB0], spProcess: this.Branch1 });
		Platform.AddInstruction("BEQ", { addressingMode: "[exp]", opCode: [, 0xF0], spProcess: this.Branch1 });
		Platform.AddInstruction("BMI", { addressingMode: "[exp]", opCode: [, 0x30], spProcess: this.Branch1 });
		Platform.AddInstruction("BNE", { addressingMode: "[exp]", opCode: [, 0xD0], spProcess: this.Branch1 });
		Platform.AddInstruction("BPL", { addressingMode: "[exp]", opCode: [, 0x10], spProcess: this.Branch1 });
		Platform.AddInstruction("BVC", { addressingMode: "[exp]", opCode: [, 0x50], spProcess: this.Branch1 });
		Platform.AddInstruction("BVS", { addressingMode: "[exp]", opCode: [, 0x70], spProcess: this.Branch1 });
		Platform.AddInstruction("BRA", { addressingMode: "[exp]", opCode: [, 0x2F], spProcess: this.Branch1 });

		Platform.AddInstruction("CBNE", { addressingMode: "[exp],X,[exp]", opCode: [, , 0xDE], spProcess: this.Branch2 });
		Platform.AddInstruction("CBNE", { addressingMode: "[exp],[exp]", opCode: [, , 0x2E], spProcess: this.Branch2 });

		Platform.AddInstruction("JMP", { addressingMode: "[[exp],X]", opCode: [, , 0x1F] });
		Platform.AddInstruction("JMP", { addressingMode: "[exp]", opCode: [, , 0x5F] });
		Platform.AddInstruction("JSP", { addressingMode: "[exp]", opCode: [, 0x4F], spProcess: this.JSP });
		Platform.AddInstruction("JSR", { addressingMode: "[exp]", opCode: [, , 0x3F] });

		Platform.AddInstruction("CLR1", { addressingMode: "[exp].0", opCode: [, 0x12] });
		Platform.AddInstruction("CLR1", { addressingMode: "[exp].1", opCode: [, 0x32] });
		Platform.AddInstruction("CLR1", { addressingMode: "[exp].2", opCode: [, 0x52] });
		Platform.AddInstruction("CLR1", { addressingMode: "[exp].3", opCode: [, 0x72] });
		Platform.AddInstruction("CLR1", { addressingMode: "[exp].4", opCode: [, 0x92] });
		Platform.AddInstruction("CLR1", { addressingMode: "[exp].5", opCode: [, 0xB2] });
		Platform.AddInstruction("CLR1", { addressingMode: "[exp].6", opCode: [, 0xD2] });
		Platform.AddInstruction("CLR1", { addressingMode: "[exp].7", opCode: [, 0xF2] });
		Platform.AddInstruction("CLR1", { addressingMode: "[exp]", opCode: [, , 0x4E] });

		Platform.AddInstruction("SET1", { addressingMode: "[exp].0", opCode: [, 0x02] });
		Platform.AddInstruction("SET1", { addressingMode: "[exp].1", opCode: [, 0x22] });
		Platform.AddInstruction("SET1", { addressingMode: "[exp].2", opCode: [, 0x42] });
		Platform.AddInstruction("SET1", { addressingMode: "[exp].3", opCode: [, 0x62] });
		Platform.AddInstruction("SET1", { addressingMode: "[exp].4", opCode: [, 0x82] });
		Platform.AddInstruction("SET1", { addressingMode: "[exp].5", opCode: [, 0xA2] });
		Platform.AddInstruction("SET1", { addressingMode: "[exp].6", opCode: [, 0xC2] });
		Platform.AddInstruction("SET1", { addressingMode: "[exp].7", opCode: [, 0xE2] });
		Platform.AddInstruction("SET1", { addressingMode: "[exp]", opCode: [, , 0x0E] });

		Platform.AddInstruction("CMP", { addressingMode: "(X),(Y)", opCode: [0x79] });
		Platform.AddInstruction("CMP", { addressingMode: "(X)", opCode: [0x66] });
		Platform.AddInstruction("CMP", { addressingMode: "[[exp],X]", opCode: [, 0x67] });
		Platform.AddInstruction("CMP", { addressingMode: "[[exp]],Y", opCode: [, 0x77] });
		Platform.AddInstruction("CMP", { addressingMode: "[exp],X", opCode: [, 0x74, 0x75] });
		Platform.AddInstruction("CMP", { addressingMode: "[exp],Y", opCode: [, , 0x76] });
		Platform.AddInstruction("CMP", { addressingMode: "[exp],#[exp]", opCode: [, , 0x78], spProcess: this.TwoOperands });
		Platform.AddInstruction("CMP", { addressingMode: "[exp],[exp]", opCode: [, , 0x69], spProcess: this.TwoOperands });
		Platform.AddInstruction("CMP", { addressingMode: "#[exp]", opCode: [, 0x68] });
		Platform.AddInstruction("CMP", { addressingMode: "[exp]", opCode: [, 0x64, 0x65] });

		Platform.AddInstruction("CPW", { addressingMode: "[exp]", opCode: [, 0x5a] });

		Platform.AddInstruction("CPX", { addressingMode: "#[exp]", opCode: [, 0xC8] });
		Platform.AddInstruction("CPX", { addressingMode: "[exp]", opCode: [, 0x3e, 0x1E] });

		Platform.AddInstruction("CPY", { addressingMode: "#[exp]", opCode: [, 0xAD] });
		Platform.AddInstruction("CPY", { addressingMode: "[exp]", opCode: [, 0x7E, 0x5E] });

		Platform.AddInstruction("DBNZ", { addressingMode: "Y,[exp]", opCode: [, 0xFE], spProcess: this.Branch1 });
		Platform.AddInstruction("DBNZ", { addressingMode: "[exp],[exp]", opCode: [, , 0x6E], spProcess: this.Branch2 });

		Platform.AddInstruction("DEC", { addressingMode: "A", opCode: [0x9C] });
		Platform.AddInstruction("DEC", { addressingMode: "[exp],X", opCode: [, 0x9B] });
		Platform.AddInstruction("DEC", { addressingMode: "[exp]", opCode: [, 0x8B, 0x8C] });
		Platform.AddInstruction("DEC", { opCode: [0x9C] });

		Platform.AddInstruction("DEW", { addressingMode: "[exp]", opCode: [, 0x1A] });

		Platform.AddInstruction("EOR", { addressingMode: "(X),(Y)", opCode: [0x59] });
		Platform.AddInstruction("EOR", { addressingMode: "(X)", opCode: [0x46] });
		Platform.AddInstruction("EOR", { addressingMode: "[[exp],X]", opCode: [, 0x47] });
		Platform.AddInstruction("EOR", { addressingMode: "[[exp]],Y", opCode: [, 0x57] });
		Platform.AddInstruction("EOR", { addressingMode: "[exp],X", opCode: [, 0x54, 0x55] });
		Platform.AddInstruction("EOR", { addressingMode: "[exp],Y", opCode: [, , 0x56] });
		Platform.AddInstruction("EOR", { addressingMode: "[exp],#[exp]", opCode: [, , 0x58], spProcess: this.TwoOperands });
		Platform.AddInstruction("EOR", { addressingMode: "[exp],[exp]", opCode: [, , 0x49], spProcess: this.TwoOperands });
		Platform.AddInstruction("EOR", { addressingMode: "#[exp]", opCode: [, 0x48] });
		Platform.AddInstruction("EOR", { addressingMode: "[exp]", opCode: [, 0x44, 0x45] });

		Platform.AddInstruction("EORC", { addressingMode: "[exp].[exp]", opCode: [, , 0x8A], spProcess: this.Bit_15_3 });

		Platform.AddInstruction("INC", { addressingMode: "A", opCode: [0xBC] });
		Platform.AddInstruction("INC", { addressingMode: "[exp],X", opCode: [, 0xBB] });
		Platform.AddInstruction("INC", { addressingMode: "[exp]", opCode: [, 0xAB, 0xAC] });
		Platform.AddInstruction("INC", { opCode: [0xBC] });

		Platform.AddInstruction("INW", { addressingMode: "[exp]", opCode: [, 0x3A] });

		Platform.AddInstruction("LDA", { addressingMode: "(X)+", opCode: [0xBF] });
		Platform.AddInstruction("LDA", { addressingMode: "(X)", opCode: [0xE6] });
		Platform.AddInstruction("LDA", { addressingMode: "[[exp],X]", opCode: [, 0xE7] });
		Platform.AddInstruction("LDA", { addressingMode: "[[exp]],Y", opCode: [, 0xF7] });
		Platform.AddInstruction("LDA", { addressingMode: "[exp],X", opCode: [, 0xF4, 0xF5] });
		Platform.AddInstruction("LDA", { addressingMode: "[exp],Y", opCode: [, , 0xF6] });
		Platform.AddInstruction("LDA", { addressingMode: "#[exp]", opCode: [, 0xE8] });
		Platform.AddInstruction("LDA", { addressingMode: "[exp]", opCode: [, 0xE4, 0xE5] });

		Platform.AddInstruction("LDC", { addressingMode: "[exp].[exp]", opCode: [, , 0xAA], spProcess: this.Bit_15_3 });

		Platform.AddInstruction("LDW", { addressingMode: "[exp]", opCode: [, 0xBA] });

		Platform.AddInstruction("LDX", { addressingMode: "[exp],Y", opCode: [, 0xF9] });
		Platform.AddInstruction("LDX", { addressingMode: "#[exp]", opCode: [, 0xCD] });
		Platform.AddInstruction("LDX", { addressingMode: "[exp]", opCode: [, 0xF8, 0xE9] });

		Platform.AddInstruction("LDY", { addressingMode: "[exp],X", opCode: [, 0xFB] });
		Platform.AddInstruction("LDY", { addressingMode: "#[exp]", opCode: [, 0x8D] });
		Platform.AddInstruction("LDY", { addressingMode: "[exp]", opCode: [, 0xEB, 0xEC] });

		Platform.AddInstruction("LSR", { addressingMode: "A", opCode: [0x5C] });
		Platform.AddInstruction("LSR", { addressingMode: "[exp],X", opCode: [, 0x5B] });
		Platform.AddInstruction("LSR", { addressingMode: "[exp]", opCode: [, 0x4B, 0x4C] });
		Platform.AddInstruction("LSR", { opCode: [0x5C] });

		Platform.AddInstruction("MOV", { addressingMode: "[exp],#[exp]", opCode: [, , 0x8F], spProcess: this.TwoOperands });
		Platform.AddInstruction("MOV", { addressingMode: "[exp],[exp]", opCode: [, , 0xFA], spProcess: this.TwoOperands });

		Platform.AddInstruction("NOT", { addressingMode: "[exp].[exp]", opCode: [, , 0xEA], spProcess: this.Bit_15_3 });

		Platform.AddInstruction("OR", { addressingMode: "[exp],#[exp]", opCode: [, , 0x18], spProcess: this.TwoOperands });
		Platform.AddInstruction("OR", { addressingMode: "[exp],[exp]", opCode: [, , 0x09], spProcess: this.TwoOperands });
		Platform.AddInstruction("OR", { addressingMode: "(X),(Y)", opCode: [0x19] });

		Platform.AddInstruction("ORA", { addressingMode: "(X),(Y)", opCode: [0x19] });
		Platform.AddInstruction("ORA", { addressingMode: "(X)", opCode: [0x06] });
		Platform.AddInstruction("ORA", { addressingMode: "[[exp],X]", opCode: [, 0x07] });
		Platform.AddInstruction("ORA", { addressingMode: "[[exp]],Y", opCode: [, 0x17] });
		Platform.AddInstruction("ORA", { addressingMode: "[exp],X", opCode: [, 0x14, 0x15] });
		Platform.AddInstruction("ORA", { addressingMode: "[exp],Y", opCode: [, , 0x16] });
		Platform.AddInstruction("ORA", { addressingMode: "#[exp]", opCode: [, 0x08] });
		Platform.AddInstruction("ORA", { addressingMode: "[exp]", opCode: [, 0x04, 0x05] });

		Platform.AddInstruction("ORC", { addressingMode: "/[exp].[exp]", opCode: [, , 0x2A], spProcess: this.Bit_15_3 });
		Platform.AddInstruction("ORC", { addressingMode: "[exp].[exp]", opCode: [, , 0x0A], spProcess: this.Bit_15_3 });

		Platform.AddInstruction("ROL", { addressingMode: "A", opCode: [0x3C] });
		Platform.AddInstruction("ROL", { addressingMode: "[exp],X", opCode: [, 0x3B] });
		Platform.AddInstruction("ROL", { addressingMode: "[exp]", opCode: [, 0x2B, 0x2C] });
		Platform.AddInstruction("ROL", { opCode: [0x3C] });

		Platform.AddInstruction("ROR", { addressingMode: "A", opCode: [0x7C] });
		Platform.AddInstruction("ROR", { addressingMode: "[exp],X", opCode: [, 0x7B] });
		Platform.AddInstruction("ROR", { addressingMode: "[exp]", opCode: [, 0x6B, 0x6C] });
		Platform.AddInstruction("ROR", { opCode: [0x7C] });

		Platform.AddInstruction("SBC", { addressingMode: "(X),(Y)", opCode: [0xB9] });
		Platform.AddInstruction("SBC", { addressingMode: "(X)", opCode: [0xA6] });
		Platform.AddInstruction("SBC", { addressingMode: "[[exp],X]", opCode: [, 0xA7] });
		Platform.AddInstruction("SBC", { addressingMode: "[[exp]],Y", opCode: [, 0xB7] });
		Platform.AddInstruction("SBC", { addressingMode: "[exp],X", opCode: [, 0xB4, 0xB5] });
		Platform.AddInstruction("SBC", { addressingMode: "[exp],Y", opCode: [, , 0xB6] });
		Platform.AddInstruction("SBC", { addressingMode: "[exp],#[exp]", opCode: [, , 0xB8], spProcess: this.TwoOperands });
		Platform.AddInstruction("SBC", { addressingMode: "[exp],[exp]", opCode: [, , 0xA9], spProcess: this.TwoOperands });
		Platform.AddInstruction("SBC", { addressingMode: "#[exp]", opCode: [, 0xA8] });
		Platform.AddInstruction("SBC", { addressingMode: "[exp]", opCode: [, 0xA4, 0xA5] });

		Platform.AddInstruction("SBW", { addressingMode: "[exp]", opCode: [, 0x9A] });

		Platform.AddInstruction("STA", { addressingMode: "(X)+", opCode: [0xAF] });
		Platform.AddInstruction("STA", { addressingMode: "(X)", opCode: [0xC6] });
		Platform.AddInstruction("STA", { addressingMode: "[[exp],X]", opCode: [, 0xC7] });
		Platform.AddInstruction("STA", { addressingMode: "[[exp]],Y", opCode: [, 0xD7] });
		Platform.AddInstruction("STA", { addressingMode: "[exp],X", opCode: [, 0xD4, 0xD5] });
		Platform.AddInstruction("STA", { addressingMode: "[exp],Y", opCode: [, , 0xD6] });
		Platform.AddInstruction("STA", { addressingMode: "[exp]", opCode: [, 0xC4, 0xC5] });

		Platform.AddInstruction("STC", { addressingMode: "[exp].[exp]", opCode: [, , 0xCA], spProcess: this.Bit_15_3 });

		Platform.AddInstruction("STW", { addressingMode: "[exp]", opCode: [, 0xDA] });

		Platform.AddInstruction("STX", { addressingMode: "[exp],Y", opCode: [, 0xD9] });
		Platform.AddInstruction("STX", { addressingMode: "[exp]", opCode: [, 0xD8, 0xC9] });

		Platform.AddInstruction("STY", { addressingMode: "[exp],X", opCode: [, 0xDB] });
		Platform.AddInstruction("STY", { addressingMode: "[exp]", opCode: [, 0xCB, 0xCC] });

		Platform.AddInstruction("NOP", { opCode: [0X00] });
		Platform.AddInstruction("PHA", { opCode: [0X2D] });
		Platform.AddInstruction("PHP", { opCode: [0X0D] });
		Platform.AddInstruction("PHX", { opCode: [0X4D] });
		Platform.AddInstruction("PHY", { opCode: [0X6D] });
		Platform.AddInstruction("PLA", { opCode: [0XAE] });
		Platform.AddInstruction("PLP", { opCode: [0X8E] });
		Platform.AddInstruction("PLX", { opCode: [0XCE] });
		Platform.AddInstruction("PLY", { opCode: [0XEE] });
		Platform.AddInstruction("RTI", { opCode: [0X7F] });
		Platform.AddInstruction("RTS", { opCode: [0X6F] });
		Platform.AddInstruction("SEC", { opCode: [0X80] });
		Platform.AddInstruction("SEI", { opCode: [0XC0] });
		Platform.AddInstruction("SEI", { opCode: [0XC0] });
		Platform.AddInstruction("SEP", { opCode: [0X40] });
		Platform.AddInstruction("CLC", { opCode: [0X60] });
		Platform.AddInstruction("CLI", { opCode: [0XA0] });
		Platform.AddInstruction("CLP", { opCode: [0X20] });
		Platform.AddInstruction("CLV", { opCode: [0XE0] });
		Platform.AddInstruction("TAX", { opCode: [0X5D] });
		Platform.AddInstruction("TAY", { opCode: [0XFD] });
		Platform.AddInstruction("TSX", { opCode: [0X9D] });
		Platform.AddInstruction("TXA", { opCode: [0X7D] });
		Platform.AddInstruction("TXS", { opCode: [0XBD] });
		Platform.AddInstruction("TYA", { opCode: [0XDD] });
		Platform.AddInstruction("WAI", { opCode: [0XEF] });
		Platform.AddInstruction("XCN", { addressingMode: "A", opCode: [0X9F] });
		Platform.AddInstruction("XCN", { opCode: [0X9F] });
		Platform.AddInstruction("DAA", { addressingMode: "A", opCode: [0XDF] });
		Platform.AddInstruction("DAA", { opCode: [0XDF] });
		Platform.AddInstruction("DAS", { addressingMode: "A", opCode: [0XBE] });
		Platform.AddInstruction("DAS", { opCode: [0XBE] });
		Platform.AddInstruction("STP", { opCode: [0XFF] });
		Platform.AddInstruction("DEX", { opCode: [0X1D] });
		Platform.AddInstruction("DEY", { opCode: [0XDC] });
		Platform.AddInstruction("INX", { opCode: [0X3D] });
		Platform.AddInstruction("INY", { opCode: [0XFC] });
		Platform.AddInstruction("DIV", { addressingMode: "YA,X", opCode: [0X9E] });
		Platform.AddInstruction("DIV", { opCode: [0X9E] });
		Platform.AddInstruction("MUL", { addressingMode: "YA", opCode: [0XCF] });
		Platform.AddInstruction("MUL", { opCode: [0XCF] });
		Platform.AddInstruction("JST0", { opCode: [0X01] });
		Platform.AddInstruction("JST1", { opCode: [0X11] });
		Platform.AddInstruction("JST2", { opCode: [0X21] });
		Platform.AddInstruction("JST3", { opCode: [0X31] });
		Platform.AddInstruction("JST4", { opCode: [0X41] });
		Platform.AddInstruction("JST5", { opCode: [0X51] });
		Platform.AddInstruction("JST6", { opCode: [0X61] });
		Platform.AddInstruction("JST7", { opCode: [0X71] });
		Platform.AddInstruction("JST8", { opCode: [0X81] });
		Platform.AddInstruction("JST9", { opCode: [0X91] });
		Platform.AddInstruction("JSTA", { opCode: [0XA1] });
		Platform.AddInstruction("JSTB", { opCode: [0XB1] });
		Platform.AddInstruction("JSTC", { opCode: [0XC1] });
		Platform.AddInstruction("JSTD", { opCode: [0XD1] });
		Platform.AddInstruction("JSTE", { opCode: [0XE1] });
		Platform.AddInstruction("JSTF", { opCode: [0XF1] });
		Platform.AddInstruction("NOTC", { opCode: [0XED] });
	}

	private TwoOperands(option: CompileOption) {
		const line = option.GetCurrent<InstructionLine>();
		const tempValue1 = ExpressionUtils.GetValue(line.expressions[0].parts, option);
		const tempValue2 = ExpressionUtils.GetValue(line.expressions[1].parts, option);
		line.lineResult.result.length = 3;
		if (!tempValue1.success || !tempValue2.success)
			return;

		line.lineResult.SetResult(line.addressMode.opCode[2]!, 0, 1);

		let setValue = line.lineResult.SetResult(tempValue1.value, 2, 1);
		if (setValue.overflow) {
			const errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", tempValue1.value, setValue.result);
			const token = ExpressionUtils.CombineExpressionPart(line.expressions[0].parts);
			MyDiagnostic.PushWarning(token, errorMsg);
		}

		setValue = line.lineResult.SetResult(tempValue2.value, 1, 1);
		if (setValue.overflow) {
			const errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", tempValue2.value, setValue.result);
			const token = ExpressionUtils.CombineExpressionPart(line.expressions[1].parts);
			MyDiagnostic.PushWarning(token, errorMsg);
		}
	}

	private Branch1(option: CompileOption) {
		const line = option.GetCurrent<InstructionLine>();
		const tempValue = ExpressionUtils.GetValue(line.expressions[0].parts, option);
		if (!tempValue.success) {
			line.lineResult.result.length = 2;
			return;
		}

		const temp = tempValue.value - line.lineResult.address.org - 2;
		if (temp > 127 || temp < -128) {
			line.lineType = LineType.Error;
			let errorMsg = Localization.GetMessage("Argument out of range")
			MyDiagnostic.PushException(line.instruction, errorMsg);
			return;
		}

		line.lineResult.SetResult(line.addressMode.opCode[1]!, 0, 1);
		line.lineResult.SetResult(temp & 0xFF, 1, 1);
		line.lineType = LineType.Finished;
	}

	private Branch2(option: CompileOption) {
		const line = option.GetCurrent<InstructionLine>();
		const tempValue = ExpressionUtils.GetValue(line.expressions[1].parts, option);
		const temp2 = (ExpressionUtils.GetValue(line.expressions[0].parts, option)).value;

		if (!tempValue.success) {
			line.lineResult.result.length = 3;
			return;
		}

		const temp = tempValue.value - line.lineResult.address.org - 3;
		if (temp > 127 || temp < -128) {
			line.lineType = LineType.Error;
			let errorMsg = Localization.GetMessage("Argument out of range")
			MyDiagnostic.PushException(line.instruction, errorMsg);
			return;
		}

		line.lineResult.SetResult(line.addressMode.opCode[2]!, 0, 1);
		line.lineResult.SetResult(temp2, 1, 1);
		line.lineResult.SetResult(temp & 0xFF, 2, 1);
		line.lineType = LineType.Finished;
	}

	private Bit_15_3(option: CompileOption) {
		const line = option.GetCurrent<InstructionLine>();
		const tempValue = ExpressionUtils.GetValue(line.expressions[0].parts, option);
		const temp2 = (ExpressionUtils.GetValue(line.expressions[1].parts, option)).value;

		if (!tempValue.success) {
			line.lineResult.result.length = 3;
			return;
		}

		const temp = tempValue.value;

		if (temp > 0x1FFF || temp < 0 || temp2 > 7 || temp2 < 0) {
			line.lineType = LineType.Error;
			let errorMsg = Localization.GetMessage("Argument out of range")
			MyDiagnostic.PushException(line.instruction, errorMsg);
			return;
		}



		let byte2 = (temp2 << 5) + (temp >> 8)
		let byte1 = (temp & 0xFF)
		line.lineResult.SetResult(line.addressMode.opCode[2]!, 0, 1);
		line.lineResult.SetResult(byte2, 2, 1);
		line.lineResult.SetResult(byte1, 1, 1);
		line.lineType = LineType.Finished;
	}

	private JSP(option: CompileOption) {
		const line = option.GetCurrent<InstructionLine>();
		const tempValue = ExpressionUtils.GetValue(line.expressions[0].parts, option);
		if (!tempValue.success) {
			line.lineResult.result.length = 2;
			return;
		}

		let temp = tempValue.value
		if (temp > 0xFFFF || temp < 0xFF00) {
			line.lineType = LineType.Error;
			let errorMsg = Localization.GetMessage("Argument out of range")
			MyDiagnostic.PushException(line.instruction, errorMsg);
			return;
		}

		temp &= 0xFF;
		line.lineResult.SetResult(line.addressMode.opCode[1]!, 0, 1);
		line.lineResult.SetResult(temp & 0xFF, 1, 1);
		line.lineType = LineType.Finished;
	}
}