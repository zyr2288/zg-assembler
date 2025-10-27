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
		this.Add("ADC", { addressingMode: "(X),(Y)", opCode: [0x99] });
		this.Add("ADC", { addressingMode: "(X)", opCode: [0x86] });
		this.Add("ADC", { addressingMode: "[[exp],X]", opCode: [, 0x87] });
		this.Add("ADC", { addressingMode: "[[exp]],Y", opCode: [, 0x97] });
		this.Add("ADC", { addressingMode: "[exp],X", opCode: [, 0x94, 0x95] });
		this.Add("ADC", { addressingMode: "[exp],Y", opCode: [, , 0x96] });
		this.Add("ADC", { addressingMode: "[exp],#[exp]", opCode: [, , 0x98], spProcess: this.TwoOperands });
		this.Add("ADC", { addressingMode: "[exp],[exp]", opCode: [, , 0x89], spProcess: this.TwoOperands });
		this.Add("ADC", { addressingMode: "#[exp]", opCode: [, 0x88] });
		this.Add("ADC", { addressingMode: "[exp]", opCode: [, 0x84, 0x85] });

		this.Add("ADW", { addressingMode: "[exp]", opCode: [, 0x7A] });

		this.Add("AND", { addressingMode: "(X),(Y)", opCode: [0x39] });
		this.Add("AND", { addressingMode: "(X)", opCode: [0x26] });
		this.Add("AND", { addressingMode: "[[exp],X]", opCode: [, 0x27] });
		this.Add("AND", { addressingMode: "[[exp]],Y", opCode: [, 0x37] });
		this.Add("AND", { addressingMode: "[exp],X", opCode: [, 0x34, 0x35] });
		this.Add("AND", { addressingMode: "[exp],Y", opCode: [, , 0x36] });
		this.Add("AND", { addressingMode: "[exp],#[exp]", opCode: [, , 0x38], spProcess: this.TwoOperands });
		this.Add("AND", { addressingMode: "[exp],[exp]", opCode: [, , 0x29], spProcess: this.TwoOperands });
		this.Add("AND", { addressingMode: "#[exp]", opCode: [, 0x28] });
		this.Add("AND", { addressingMode: "[exp]", opCode: [, 0x24, 25] });


		this.Add("ANDC", { addressingMode: "/[exp].[exp]", opCode: [, , 0x6A], spProcess: this.Bit_15_3 });
		this.Add("ANDC", { addressingMode: "[exp].[exp]", opCode: [, , 0x4A], spProcess: this.Bit_15_3 });

		this.Add("ASL", { addressingMode: "A", opCode: [0x1C] });
		this.Add("ASL", { addressingMode: "[exp],X", opCode: [, 0x1B] });
		this.Add("ASL", { addressingMode: "[exp]", opCode: [, 0x0B, 0x0C] });
		this.Add("ASL", { addressingMode: "", opCode: [0x1C] });

		this.Add("BBC", { addressingMode: "[exp].0,[exp]", opCode: [, , 0x13], spProcess: this.Branch2 });
		this.Add("BBC", { addressingMode: "[exp].1,[exp]", opCode: [, , 0x33], spProcess: this.Branch2 });
		this.Add("BBC", { addressingMode: "[exp].2,[exp]", opCode: [, , 0x53], spProcess: this.Branch2 });
		this.Add("BBC", { addressingMode: "[exp].3,[exp]", opCode: [, , 0x73], spProcess: this.Branch2 });
		this.Add("BBC", { addressingMode: "[exp].4,[exp]", opCode: [, , 0x93], spProcess: this.Branch2 });
		this.Add("BBC", { addressingMode: "[exp].5,[exp]", opCode: [, , 0xB3], spProcess: this.Branch2 });
		this.Add("BBC", { addressingMode: "[exp].6,[exp]", opCode: [, , 0xD3], spProcess: this.Branch2 });
		this.Add("BBC", { addressingMode: "[exp].7,[exp]", opCode: [, , 0xF3], spProcess: this.Branch2 });

		this.Add("BBS", { addressingMode: "[exp].0,[exp]", opCode: [, , 0x03], spProcess: this.Branch2 });
		this.Add("BBS", { addressingMode: "[exp].1,[exp]", opCode: [, , 0x23], spProcess: this.Branch2 });
		this.Add("BBS", { addressingMode: "[exp].2,[exp]", opCode: [, , 0x43], spProcess: this.Branch2 });
		this.Add("BBS", { addressingMode: "[exp].3,[exp]", opCode: [, , 0x63], spProcess: this.Branch2 });
		this.Add("BBS", { addressingMode: "[exp].4,[exp]", opCode: [, , 0x83], spProcess: this.Branch2 });
		this.Add("BBS", { addressingMode: "[exp].5,[exp]", opCode: [, , 0xA3], spProcess: this.Branch2 });
		this.Add("BBS", { addressingMode: "[exp].6,[exp]", opCode: [, , 0xC3], spProcess: this.Branch2 });
		this.Add("BBS", { addressingMode: "[exp].7,[exp]", opCode: [, , 0xE3], spProcess: this.Branch2 });

		this.Add("BCC", { addressingMode: "[exp]", opCode: [, 0x90], spProcess: this.Branch1 });
		this.Add("BCS", { addressingMode: "[exp]", opCode: [, 0xB0], spProcess: this.Branch1 });
		this.Add("BEQ", { addressingMode: "[exp]", opCode: [, 0xF0], spProcess: this.Branch1 });
		this.Add("BMI", { addressingMode: "[exp]", opCode: [, 0x30], spProcess: this.Branch1 });
		this.Add("BNE", { addressingMode: "[exp]", opCode: [, 0xD0], spProcess: this.Branch1 });
		this.Add("BPL", { addressingMode: "[exp]", opCode: [, 0x10], spProcess: this.Branch1 });
		this.Add("BVC", { addressingMode: "[exp]", opCode: [, 0x50], spProcess: this.Branch1 });
		this.Add("BVS", { addressingMode: "[exp]", opCode: [, 0x70], spProcess: this.Branch1 });
		this.Add("BRA", { addressingMode: "[exp]", opCode: [, 0x2F], spProcess: this.Branch1 });

		this.Add("CBNE", { addressingMode: "[exp],X,[exp]", opCode: [, , 0xDE], spProcess: this.Branch2 });
		this.Add("CBNE", { addressingMode: "[exp],[exp]", opCode: [, , 0x2E], spProcess: this.Branch2 });

		this.Add("JMP", { addressingMode: "[[exp],X]", opCode: [, , 0x1F] });
		this.Add("JMP", { addressingMode: "[exp]", opCode: [, , 0x5F] });
		this.Add("JSP", { addressingMode: "[exp]", opCode: [, 0x4F], spProcess: this.JSP });
		this.Add("JSR", { addressingMode: "[exp]", opCode: [, , 0x3F] });

		this.Add("CLR1", { addressingMode: "[exp].0", opCode: [, 0x12] });
		this.Add("CLR1", { addressingMode: "[exp].1", opCode: [, 0x32] });
		this.Add("CLR1", { addressingMode: "[exp].2", opCode: [, 0x52] });
		this.Add("CLR1", { addressingMode: "[exp].3", opCode: [, 0x72] });
		this.Add("CLR1", { addressingMode: "[exp].4", opCode: [, 0x92] });
		this.Add("CLR1", { addressingMode: "[exp].5", opCode: [, 0xB2] });
		this.Add("CLR1", { addressingMode: "[exp].6", opCode: [, 0xD2] });
		this.Add("CLR1", { addressingMode: "[exp].7", opCode: [, 0xF2] });
		this.Add("CLR1", { addressingMode: "[exp]", opCode: [, , 0x4E] });

		this.Add("SET1", { addressingMode: "[exp].0", opCode: [, 0x02] });
		this.Add("SET1", { addressingMode: "[exp].1", opCode: [, 0x22] });
		this.Add("SET1", { addressingMode: "[exp].2", opCode: [, 0x42] });
		this.Add("SET1", { addressingMode: "[exp].3", opCode: [, 0x62] });
		this.Add("SET1", { addressingMode: "[exp].4", opCode: [, 0x82] });
		this.Add("SET1", { addressingMode: "[exp].5", opCode: [, 0xA2] });
		this.Add("SET1", { addressingMode: "[exp].6", opCode: [, 0xC2] });
		this.Add("SET1", { addressingMode: "[exp].7", opCode: [, 0xE2] });
		this.Add("SET1", { addressingMode: "[exp]", opCode: [, , 0x0E] });

		this.Add("CMP", { addressingMode: "(X),(Y)", opCode: [0x79] });
		this.Add("CMP", { addressingMode: "(X)", opCode: [0x66] });
		this.Add("CMP", { addressingMode: "[[exp],X]", opCode: [, 0x67] });
		this.Add("CMP", { addressingMode: "[[exp]],Y", opCode: [, 0x77] });
		this.Add("CMP", { addressingMode: "[exp],X", opCode: [, 0x74, 0x75] });
		this.Add("CMP", { addressingMode: "[exp],Y", opCode: [, , 0x76] });
		this.Add("CMP", { addressingMode: "[exp],#[exp]", opCode: [, , 0x78], spProcess: this.TwoOperands });
		this.Add("CMP", { addressingMode: "[exp],[exp]", opCode: [, , 0x69], spProcess: this.TwoOperands });
		this.Add("CMP", { addressingMode: "#[exp]", opCode: [, 0x68] });
		this.Add("CMP", { addressingMode: "[exp]", opCode: [, 0x64, 0x65] });

		this.Add("CPW", { addressingMode: "[exp]", opCode: [, 0x5a] });

		this.Add("CPX", { addressingMode: "#[exp]", opCode: [, 0xC8] });
		this.Add("CPX", { addressingMode: "[exp]", opCode: [, 0x3e, 0x1E] });

		this.Add("CPY", { addressingMode: "#[exp]", opCode: [, 0xAD] });
		this.Add("CPY", { addressingMode: "[exp]", opCode: [, 0x7E, 0x5E] });

		this.Add("DBNZ", { addressingMode: "Y,[exp]", opCode: [, 0xFE], spProcess: this.Branch1 });
		this.Add("DBNZ", { addressingMode: "[exp],[exp]", opCode: [, , 0x6E], spProcess: this.Branch2 });

		this.Add("DEC", { addressingMode: "A", opCode: [0x9C] });
		this.Add("DEC", { addressingMode: "[exp],X", opCode: [, 0x9B] });
		this.Add("DEC", { addressingMode: "[exp]", opCode: [, 0x8B, 0x8C] });
		this.Add("DEC", { addressingMode: "", opCode: [0x9C] });

		this.Add("DEW", { addressingMode: "[exp]", opCode: [, 0x1A] });

		this.Add("EOR", { addressingMode: "(X),(Y)", opCode: [0x59] });
		this.Add("EOR", { addressingMode: "(X)", opCode: [0x46] });
		this.Add("EOR", { addressingMode: "[[exp],X]", opCode: [, 0x47] });
		this.Add("EOR", { addressingMode: "[[exp]],Y", opCode: [, 0x57] });
		this.Add("EOR", { addressingMode: "[exp],X", opCode: [, 0x54, 0x55] });
		this.Add("EOR", { addressingMode: "[exp],Y", opCode: [, , 0x56] });
		this.Add("EOR", { addressingMode: "[exp],#[exp]", opCode: [, , 0x58], spProcess: this.TwoOperands });
		this.Add("EOR", { addressingMode: "[exp],[exp]", opCode: [, , 0x49], spProcess: this.TwoOperands });
		this.Add("EOR", { addressingMode: "#[exp]", opCode: [, 0x48] });
		this.Add("EOR", { addressingMode: "[exp]", opCode: [, 0x44, 0x45] });

		this.Add("EORC", { addressingMode: "[exp].[exp]", opCode: [, , 0x8A], spProcess: this.Bit_15_3 });

		this.Add("INC", { addressingMode: "A", opCode: [0xBC] });
		this.Add("INC", { addressingMode: "[exp],X", opCode: [, 0xBB] });
		this.Add("INC", { addressingMode: "[exp]", opCode: [, 0xAB, 0xAC] });
		this.Add("INC", { addressingMode: "", opCode: [0xBC] });

		this.Add("INW", { addressingMode: "[exp]", opCode: [, 0x3A] });

		this.Add("LDA", { addressingMode: "(X)+", opCode: [0xBF] });
		this.Add("LDA", { addressingMode: "(X)", opCode: [0xE6] });
		this.Add("LDA", { addressingMode: "[[exp],X]", opCode: [, 0xE7] });
		this.Add("LDA", { addressingMode: "[[exp]],Y", opCode: [, 0xF7] });
		this.Add("LDA", { addressingMode: "[exp],X", opCode: [, 0xF4, 0xF5] });
		this.Add("LDA", { addressingMode: "[exp],Y", opCode: [, , 0xF6] });
		this.Add("LDA", { addressingMode: "#[exp]", opCode: [, 0xE8] });
		this.Add("LDA", { addressingMode: "[exp]", opCode: [, 0xE4, 0xE5] });

		this.Add("LDC", { addressingMode: "[exp].[exp]", opCode: [, , 0xAA], spProcess: this.Bit_15_3 });

		this.Add("LDW", { addressingMode: "[exp]", opCode: [, 0xBA] });

		this.Add("LDX", { addressingMode: "[exp],Y", opCode: [, 0xF9] });
		this.Add("LDX", { addressingMode: "#[exp]", opCode: [, 0xCD] });
		this.Add("LDX", { addressingMode: "[exp]", opCode: [, 0xF8, 0xE9] });

		this.Add("LDY", { addressingMode: "[exp],X", opCode: [, 0xFB] });
		this.Add("LDY", { addressingMode: "#[exp]", opCode: [, 0x8D] });
		this.Add("LDY", { addressingMode: "[exp]", opCode: [, 0xEB, 0xEC] });

		this.Add("LSR", { addressingMode: "A", opCode: [0x5C] });
		this.Add("LSR", { addressingMode: "[exp],X", opCode: [, 0x5B] });
		this.Add("LSR", { addressingMode: "[exp]", opCode: [, 0x4B, 0x4C] });
		this.Add("LSR", { addressingMode: "", opCode: [0x5C] });

		this.Add("MOV", { addressingMode: "[exp],#[exp]", opCode: [, , 0x8F], spProcess: this.TwoOperands });
		this.Add("MOV", { addressingMode: "[exp],[exp]", opCode: [, , 0xFA], spProcess: this.TwoOperands });

		this.Add("NOT", { addressingMode: "[exp].[exp]", opCode: [, , 0xEA], spProcess: this.Bit_15_3 });

		this.Add("OR", { addressingMode: "[exp],#[exp]", opCode: [, , 0x18], spProcess: this.TwoOperands });
		this.Add("OR", { addressingMode: "[exp],[exp]", opCode: [, , 0x09], spProcess: this.TwoOperands });
		this.Add("OR", { addressingMode: "(X),(Y)", opCode: [0x19] });

		this.Add("ORA", { addressingMode: "(X),(Y)", opCode: [0x19] });
		this.Add("ORA", { addressingMode: "(X)", opCode: [0x06] });
		this.Add("ORA", { addressingMode: "[[exp],X]", opCode: [, 0x07] });
		this.Add("ORA", { addressingMode: "[[exp]],Y", opCode: [, 0x17] });
		this.Add("ORA", { addressingMode: "[exp],X", opCode: [, 0x14, 0x15] });
		this.Add("ORA", { addressingMode: "[exp],Y", opCode: [, , 0x16] });
		this.Add("ORA", { addressingMode: "#[exp]", opCode: [, 0x08] });
		this.Add("ORA", { addressingMode: "[exp]", opCode: [, 0x04, 0x05] });

		this.Add("ORC", { addressingMode: "/[exp].[exp]", opCode: [, , 0x2A], spProcess: this.Bit_15_3 });
		this.Add("ORC", { addressingMode: "[exp].[exp]", opCode: [, , 0x0A], spProcess: this.Bit_15_3 });

		this.Add("ROL", { addressingMode: "A", opCode: [0x3C] });
		this.Add("ROL", { addressingMode: "[exp],X", opCode: [, 0x3B] });
		this.Add("ROL", { addressingMode: "[exp]", opCode: [, 0x2B, 0x2C] });
		this.Add("ROL", { addressingMode: "", opCode: [0x3C] });

		this.Add("ROR", { addressingMode: "A", opCode: [0x7C] });
		this.Add("ROR", { addressingMode: "[exp],X", opCode: [, 0x7B] });
		this.Add("ROR", { addressingMode: "[exp]", opCode: [, 0x6B, 0x6C] });
		this.Add("ROR", { addressingMode: "", opCode: [0x7C] });

		this.Add("SBC", { addressingMode: "(X),(Y)", opCode: [0xB9] });
		this.Add("SBC", { addressingMode: "(X)", opCode: [0xA6] });
		this.Add("SBC", { addressingMode: "[[exp],X]", opCode: [, 0xA7] });
		this.Add("SBC", { addressingMode: "[[exp]],Y", opCode: [, 0xB7] });
		this.Add("SBC", { addressingMode: "[exp],X", opCode: [, 0xB4, 0xB5] });
		this.Add("SBC", { addressingMode: "[exp],Y", opCode: [, , 0xB6] });
		this.Add("SBC", { addressingMode: "[exp],#[exp]", opCode: [, , 0xB8], spProcess: this.TwoOperands });
		this.Add("SBC", { addressingMode: "[exp],[exp]", opCode: [, , 0xA9], spProcess: this.TwoOperands });
		this.Add("SBC", { addressingMode: "#[exp]", opCode: [, 0xA8] });
		this.Add("SBC", { addressingMode: "[exp]", opCode: [, 0xA4, 0xA5] });

		this.Add("SBW", { addressingMode: "[exp]", opCode: [, 0x9A] });

		this.Add("STA", { addressingMode: "(X)+", opCode: [0xAF] });
		this.Add("STA", { addressingMode: "(X)", opCode: [0xC6] });
		this.Add("STA", { addressingMode: "[[exp],X]", opCode: [, 0xC7] });
		this.Add("STA", { addressingMode: "[[exp]],Y", opCode: [, 0xD7] });
		this.Add("STA", { addressingMode: "[exp],X", opCode: [, 0xD4, 0xD5] });
		this.Add("STA", { addressingMode: "[exp],Y", opCode: [, , 0xD6] });
		this.Add("STA", { addressingMode: "[exp]", opCode: [, 0xC4, 0xC5] });

		this.Add("STC", { addressingMode: "[exp].[exp]", opCode: [, , 0xCA], spProcess: this.Bit_15_3 });

		this.Add("STW", { addressingMode: "[exp]", opCode: [, 0xDA] });

		this.Add("STX", { addressingMode: "[exp],Y", opCode: [, 0xD9] });
		this.Add("STX", { addressingMode: "[exp]", opCode: [, 0xD8, 0xC9] });

		this.Add("STY", { addressingMode: "[exp],X", opCode: [, 0xDB] });
		this.Add("STY", { addressingMode: "[exp]", opCode: [, 0xCB, 0xCC] });

		this.Add("NOP", { addressingMode: "", opCode: [0X00] });
		this.Add("PHA", { addressingMode: "", opCode: [0X2D] });
		this.Add("PHP", { addressingMode: "", opCode: [0X0D] });
		this.Add("PHX", { addressingMode: "", opCode: [0X4D] });
		this.Add("PHY", { addressingMode: "", opCode: [0X6D] });
		this.Add("PLA", { addressingMode: "", opCode: [0XAE] });
		this.Add("PLP", { addressingMode: "", opCode: [0X8E] });
		this.Add("PLX", { addressingMode: "", opCode: [0XCE] });
		this.Add("PLY", { addressingMode: "", opCode: [0XEE] });
		this.Add("RTI", { addressingMode: "", opCode: [0X7F] });
		this.Add("RTS", { addressingMode: "", opCode: [0X6F] });
		this.Add("SEC", { addressingMode: "", opCode: [0X80] });
		this.Add("SEI", { addressingMode: "", opCode: [0XC0] });
		this.Add("SEI", { addressingMode: "", opCode: [0XC0] });
		this.Add("SEP", { addressingMode: "", opCode: [0X40] });
		this.Add("CLC", { addressingMode: "", opCode: [0X60] });
		this.Add("CLI", { addressingMode: "", opCode: [0XA0] });
		this.Add("CLP", { addressingMode: "", opCode: [0X20] });
		this.Add("CLV", { addressingMode: "", opCode: [0XE0] });
		this.Add("TAX", { addressingMode: "", opCode: [0X5D] });
		this.Add("TAY", { addressingMode: "", opCode: [0XFD] });
		this.Add("TSX", { addressingMode: "", opCode: [0X9D] });
		this.Add("TXA", { addressingMode: "", opCode: [0X7D] });
		this.Add("TXS", { addressingMode: "", opCode: [0XBD] });
		this.Add("TYA", { addressingMode: "", opCode: [0XDD] });
		this.Add("WAI", { addressingMode: "", opCode: [0XEF] });
		this.Add("XCN", { addressingMode: "A", opCode: [0X9F] });
		this.Add("XCN", { addressingMode: "", opCode: [0X9F] });
		this.Add("DAA", { addressingMode: "A", opCode: [0XDF] });
		this.Add("DAA", { addressingMode: "", opCode: [0XDF] });
		this.Add("DAS", { addressingMode: "A", opCode: [0XBE] });
		this.Add("DAS", { addressingMode: "", opCode: [0XBE] });
		this.Add("STP", { addressingMode: "", opCode: [0XFF] });
		this.Add("DEX", { addressingMode: "", opCode: [0X1D] });
		this.Add("DEY", { addressingMode: "", opCode: [0XDC] });
		this.Add("INX", { addressingMode: "", opCode: [0X3D] });
		this.Add("INY", { addressingMode: "", opCode: [0XFC] });
		this.Add("DIV", { addressingMode: "YA,X", opCode: [0X9E] });
		this.Add("DIV", { addressingMode: "", opCode: [0X9E] });
		this.Add("MUL", { addressingMode: "YA", opCode: [0XCF] });
		this.Add("MUL", { addressingMode: "", opCode: [0XCF] });
		this.Add("JST0", { addressingMode: "", opCode: [0X01] });
		this.Add("JST1", { addressingMode: "", opCode: [0X11] });
		this.Add("JST2", { addressingMode: "", opCode: [0X21] });
		this.Add("JST3", { addressingMode: "", opCode: [0X31] });
		this.Add("JST4", { addressingMode: "", opCode: [0X41] });
		this.Add("JST5", { addressingMode: "", opCode: [0X51] });
		this.Add("JST6", { addressingMode: "", opCode: [0X61] });
		this.Add("JST7", { addressingMode: "", opCode: [0X71] });
		this.Add("JST8", { addressingMode: "", opCode: [0X81] });
		this.Add("JST9", { addressingMode: "", opCode: [0X91] });
		this.Add("JSTA", { addressingMode: "", opCode: [0XA1] });
		this.Add("JSTB", { addressingMode: "", opCode: [0XB1] });
		this.Add("JSTC", { addressingMode: "", opCode: [0XC1] });
		this.Add("JSTD", { addressingMode: "", opCode: [0XD1] });
		this.Add("JSTE", { addressingMode: "", opCode: [0XE1] });
		this.Add("JSTF", { addressingMode: "", opCode: [0XF1] });
		this.Add("NOTC", { addressingMode: "", opCode: [0XED] });
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

	private Add(instruction: string, addressingMode: AddInstructionOption) {
		Platform.AddInstruction(instruction, addressingMode);
	}
}