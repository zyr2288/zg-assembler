import { Localization } from "../l10n/Localization";
import { Asm6502 } from "./Asm6502";
import { Asm65816 } from "./Asm65816";
import { AsmCommon } from "./AsmCommon";

/**平台 */
export class Platform {

	static platform: AsmCommon;

	/**改变编译平台 */
	static ChangePlatform(platform: string) {
		switch (platform) {
			case "6502":
				Platform.platform = new Asm6502();
				break;
			case "65816":
				Platform.platform = new Asm65816();
				break;
			default:
				const errorMsg = Localization.GetMessage("Unsupport Platform {0}", platform);
				throw new Error(errorMsg);
		}
	}
}