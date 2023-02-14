import { Commands } from "../Commands/Commands";
import { Localization } from "../l10n/Localization";
import { Utils } from "../Base/Utils";
import { Asm6502 } from "./Asm6502";
import { Asm65816 } from "./Asm65816";
import { AsmCommon } from "./AsmCommon";

export type SupportPlatform = "6502" | "65816";

/**平台 */
export class Platform {

	static platform: AsmCommon;
	static regexString: string;

	/**改变编译平台 */
	static ChangePlatform(platform: SupportPlatform) {
		switch (platform) {
			case "6502":
				Platform.platform = new Asm6502();
				break;
			case "65816":
				Platform.platform = new Asm65816();
				break;
			default:
				const errorMsg = Localization.GetMessage("Unsupport platform {0}", platform);
				throw new Error(errorMsg);
		}
		Platform.UpdateRegex();
	}

	//#region 更新编译平台的正则表达式
	private static UpdateRegex() {
		Platform.regexString = "(\\s+|^)(?<command>";
		for (let i = 0; i < Commands.AllCommand.length; ++i)
			Platform.regexString += Utils.TransformRegex(Commands.AllCommand[i]) + "|";

		Platform.regexString = Platform.regexString.substring(0, Platform.regexString.length - 1);
		Platform.regexString += ")|";

		Platform.regexString += "(?<instruction>";
		let instructions = Platform.platform.instructions;
		for (let i = 0; i < instructions.length; ++i)
			Platform.regexString += Utils.TransformRegex(instructions[i]) + "|";

		Platform.regexString = Platform.regexString.substring(0, Platform.regexString.length - 1);
		Platform.regexString += ")|(?<variable>\\=!\\=)(\\s+|$)"
	}
	//#endregion 更新编译平台的正则表达式
	
}