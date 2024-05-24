import { Utils } from "../Base/Utils";
import { Commands } from "../Commands/Commands";
import { Localization } from "../I18n/Localization";
import { IntellisenseProvider } from "../LanguageHelper/IntellisenseProvider";
import { AsmCommon, AsmInstruction } from "./AsmCommon";
import { Asm6502 } from "./Asm6502";
import { Asm65C816 } from "./Asm65C816";
import { AsmZ80_GB } from "./AsmZ80-GB";

export const MatchNames = {
	command: "command",
	instruction: "instruction",
	variable: "variable"
}

/**平台 */
export class Platform {

	/**当前平台 */
	static platform: AsmInstruction;

	static allInstruction: Set<string> = new Set<string>();

	/**所有平台名称 */
	private static platformNames: string[];

	/**各个平台的主要类 */
	private static platforms = [Asm6502, Asm65C816, AsmZ80_GB];

	//#region 改变编译平台，目前有 6502 65816 z80-gb
	/**
	 * 改变编译平台
	 * @param platform 编译平台 目前有 6502 65816 z80-gb
	 */
	static ChangePlatform(platform: string) {
		Platform.allInstruction.clear();

		switch (platform) {
			case Asm6502.Name:
				Platform.platform = new Asm6502();
				break;
			case AsmZ80_GB.Name:
				Platform.platform = new AsmZ80_GB();
				break;
			case Asm65C816.Name:
				Platform.platform = new Asm65C816();
				break;
			default:
				const errorMsg = Localization.GetMessage("Unsupport platform {0}", platform);
				throw new Error(errorMsg);
		}

		IntellisenseProvider.UpdateCommandCompletions();
		IntellisenseProvider.UpdateInstrucionCompletions();
	}
	//#endregion 改变编译平台，目前有 6502 65816 z80-gb
}