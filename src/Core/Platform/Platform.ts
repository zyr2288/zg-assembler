import { CompileOption } from "../Base/CompileOption";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { IntellisenseProvider } from "../LanguageHelper/IntellisenseProvider";
import { Asm6502 } from "./Asm6502";
import { Asm65C816 } from "./Asm65C816";
import { AsmSM83_GB } from "./AsmSM83-GB";
import { AsmSPC700 } from "./AsmSPC700";
import { AsmZ80_GB } from "./AsmZ80-GB";

export interface IAddressingMode {
	/**寻址正则表达式的分割 */
	addressType: string[];
	/**寻址模式，正则表达式 或例如：([exp]),Y */
	addressingMode?: string;
	/**操作码 */
	opCode: Array<number | undefined>;
	/**操作码长度 */
	opCodeLength: Array<number | undefined>;
	/**汇编模式特殊处理 */
	spProcess?: (option: CompileOption) => void;
}

export interface AddInstructionOption {
	/**汇编模式特殊处理 */
	spProcess?: (option: CompileOption) => void;
	/**寻址模式，可用正则表达式 或例如：([exp]),Y */
	addressingMode?: string,
	/**
	 * 操作码，后续寻址模式长度为 index，例如 LDA #nn，寻址长度为 1byte，所以 0xA9 的下标为1
	 * 
	 * 如果操作码是多个字节，请使用先低位后高位的数值进行输入，否则输出结果会相反
	 */
	opCode: Array<number | undefined>;
	/**操作码长度，不输入则系统自动判断 */
	opCodeLength?: Array<number | undefined>;
}

/**平台 */
export class Platform {

	static platformName = "";

	/**Key为 Instruction，例如：LDA */
	static instructions: Map<string, IAddressingMode[]> = new Map();

	// private static asmPlatform: Asm6502 | AsmSPC700 | Asm65C816 | AsmZ80_GB | AsmSM83_GB;

	//#region 切换平台
	static SwitchPlatform(platform: string) {
		Platform.instructions.clear();
		let constructor;
		switch (platform) {
			case Asm6502.platformName: constructor = Asm6502; break;
			case AsmSPC700.platformName: constructor = AsmSPC700; break;
			case Asm65C816.platformName: constructor = Asm65C816; break;
			case AsmZ80_GB.platformName: constructor = AsmZ80_GB; break;
			case AsmSM83_GB.platformName: constructor = AsmSM83_GB; break;
			default:
				const errorMsg = Localization.GetMessage("Unsupport platform {0}", platform);
				throw new Error(errorMsg);
		}
		new constructor();
		Platform.platformName = constructor.platformName;
		IntellisenseProvider.UpdateInstruction();
	}
	//#endregion 切换平台

	//#region 添加额外定长汇编指令
	/**
	 * 添加额外定长汇编指令
	 * @param instruction 汇编指令
	 * @param addressingMode 地址模式
	 * @returns 
	 */
	static AddInstruction(instruction: string, addressingMode: AddInstructionOption) {
		Platform.AddInstructionBase(instruction, addressingMode);
		const count = addressingMode.opCode.filter(v => v !== undefined);
		if (count.length < 2)
			return;

		for (let j = 1; j < addressingMode.opCode.length; j++) {
			const opcode = addressingMode.opCode[j];
			if (opcode === undefined)
				continue;

			const tempCodes = [];
			tempCodes.length = j + 1;
			tempCodes[j] = opcode;
			Platform.AddInstructionBase(`${instruction}.${j}`, { addressingMode: addressingMode.addressingMode, opCode: tempCodes });
		}
	}
	//#endregion 添加额外定长汇编指令

	//#region 匹配指令
	/**
	 * 匹配指令
	 * @param instruction 汇编指令
	 * @param expression 表达式
	 * @returns 
	 */
	static MatchAddressingMode(instruction: Token, expression: Token) {
		const addressTypes = Platform.instructions.get(instruction.text.toUpperCase());
		if (!addressTypes) {
			let errorMsg = Localization.GetMessage("Unknow instruction {0}", instruction.text);
			MyDiagnostic.PushException(instruction, errorMsg);
			return;
		}

		const result = { addressingMode: {} as IAddressingMode, exprs: [] as Token[] }
		let start = 0, foundAddressType = false;

		// 每个类型都判断一次
		for (let i = 0; i < addressTypes.length; ++i) {
			const type = addressTypes[i];

			// 重置搜索结果
			result.exprs = [];
			foundAddressType = false;

			// 表达式为空
			if (expression.isEmpty) {
				if (type.addressType.length === 0) {
					foundAddressType = true;
					result.addressingMode = type;
					break;
				}
			}

			// 表达式不为空
			else {
				if (type.addressType.length === 0)
					continue;

				let text = expression.text;
				start = 0;
				foundAddressType = true;
				for (let j = 0; j < type.addressType.length; ++j) {
					if (type.addressType[j] === "")
						continue;

					const regex = new RegExp(type.addressType[j], "i");
					const match = regex.exec(text);
					if (!match) {
						foundAddressType = false;
						break;
					}

					const token = expression.Substring(start, match.index);
					if (!type.addressType[j].startsWith("^") && !token.isEmpty) {
						result.exprs.push(token);
					}

					start += match.index + match[0].length;
					text = text.substring(start);
				}

				if (foundAddressType) {
					result.addressingMode = type;
					break;
				}
			}
		}

		if (!foundAddressType) {
			let errorMsg = Localization.GetMessage("Instruction {0} do not support this addressing mode", instruction.text);
			MyDiagnostic.PushException(instruction, errorMsg);
			return;
		} else {
			for (let i = 0; i < result.exprs.length; ++i) {
				if (result.exprs[i].isEmpty) {
					let errorMsg = Localization.GetMessage("Expression error");
					MyDiagnostic.PushException(result.exprs[i], errorMsg);
					return;
				}
			}
		}

		return result;
	}
	//#endregion 匹配指令

	//#region 判断输入内容是否在忽略内容内
	/**判断输入内容是否在忽略内容内 */
	static MatchLinePosition(instruction: string, restText: string, restCurrect: number) {
		instruction = instruction.toUpperCase();
		const modes = Platform.instructions.get(instruction);
		if (!modes)
			return false;

		for (let i = 0; i < modes.length; i++) {
			let adType = modes[i].addressType;
			let expRange = [];
			for (let j = 0; j < adType.length; j++) {
				if (adType[j] === "")
					continue;

				const regex = new RegExp(adType[j], "i");
				let match = regex.exec(restText);
				if (!match) {
					expRange = [];
					break;
				}

				if (match[0].length !== 0 &&
					match.index <= restCurrect &&
					restCurrect <= match.index + match[0].length - 1) {
					return true;
				}
			}
		}
	}
	//#endregion 判断输入内容是否在忽略内容内

	/***** private *****/

	//#region 添加基础指令
	/**
	 * 添加基础指令
	 * @param operation 汇编指令，例如：LDA
	 * @param option 添加寻址方式选项
	 */
	private static AddInstructionBase(operation: string, option: AddInstructionOption) {
		operation = operation.toUpperCase();
		let index = Platform.instructions.get(operation);
		if (!index) {
			index = [];
			Platform.instructions.set(operation, index);
		}

		const type: IAddressingMode = { addressingMode: option.addressingMode, addressType: [], opCode: [], opCodeLength: [] };
		if (option.addressingMode) {
			let match;
			let start = 0, temp: string, stringMatch: string[] = [], findExp = false;
			const regex = /\[exp\]/g;

			while (match = regex.exec(option.addressingMode)) {
				temp = option.addressingMode.substring(start, match.index).trim();
				if (temp)
					stringMatch.push(Utils.TransformRegex(temp));

				stringMatch.push("");
				start = match.index + match[0].length;
				findExp = true;
			}

			temp = option.addressingMode.substring(start).trim();
			if (temp)
				stringMatch.push(Utils.TransformRegex(temp));

			if (stringMatch.length !== 1 || !findExp)
				stringMatch[0] = "^" + stringMatch[0];

			stringMatch[stringMatch.length - 1] = stringMatch[stringMatch.length - 1] + "$";

			type.addressType = stringMatch;
		}

		type.opCode = option.opCode;
		type.spProcess = option.spProcess;

		if (!option.opCodeLength) {
			for (let i = 0; i < type.opCode.length; ++i) {
				const opCode = type.opCode[i];
				if (opCode === undefined)
					continue;

				type.opCodeLength[i] = Utils.GetNumberByteLength(opCode);
			}
		} else {
			type.opCodeLength = option.opCodeLength;
		}

		index.push(type);
	}
	//#endregion 添加基础指令

}