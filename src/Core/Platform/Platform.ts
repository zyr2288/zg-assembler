import { Utils } from "../Base/Utils";
import { Commands } from "../Commands/Commands";
import { Localization } from "../I18n/Localization";
import { IntellisenseProvider } from "../LanguageHelper/IntellisenseProvider";
import { Asm6502 } from "./Asm6502";
import { Asm65816 } from "./Asm65816";
import { AsmCommon } from "./AsmCommon";
import { AsmGBZ80 } from "./AsmGBZ80";

/**平台 */
export class Platform {

	static platform: AsmCommon;
	/**匹配编译器命令，编译指令，等式字符串，匹配结果 command instruction variable */
	static regexString: string;

	/**改变编译平台，目前有 6502 65816 gbz80 */
	static ChangePlatform(platform: string) {
		switch (platform) {
			case "6502":
				Platform.platform = new Asm6502();
				break;
			case "65816":
				Platform.platform = new Asm65816();
				break;
			case "gbz80":
				Platform.platform = new AsmGBZ80();
				break;
			default:
				const errorMsg = Localization.GetMessage("Unsupport platform {0}", platform);
				throw new Error(errorMsg);
		}
		Platform.UpdateRegex();
		IntellisenseProvider.UpdateCommandCompletions();
		IntellisenseProvider.UpdateInstrucionCompletions();
	}

	//#region 更新编译平台的正则表达式
	private static UpdateRegex() {

		Platform.regexString = "((\\s+|^)((?<command>";
		let temp: string;
		Commands.allCommandNames.forEach((value) => {
			temp = Utils.TransformRegex(value) + "|";
			Platform.regexString += temp;
		});

		Platform.regexString = Platform.regexString.substring(0, Platform.regexString.length - 1);
		Platform.regexString += ")|";

		Platform.regexString += "(?<instruction>";
		let instructions = Platform.platform.instructions;
		for (let i = 0; i < instructions.length; ++i) {
			temp = Utils.TransformRegex(instructions[i]) + "|";
			Platform.regexString += temp;
		}

		Platform.regexString = Platform.regexString.substring(0, Platform.regexString.length - 1);
		Platform.regexString += "))(\\s+|$))|(?<variable>\\=)"
	}
	//#endregion 更新编译平台的正则表达式

}