import { Utils } from "../Base/Utils";
import { Commands } from "../Commands/Commands";
import { Localization } from "../I18n/Localization";
import { IntellisenseProvider } from "../LanguageHelper/IntellisenseProvider";
import { AsmCommon } from "./AsmCommon";
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

	static platform: AsmCommon;
	/**匹配编译器命令，编译指令，等式字符串，匹配结果 command instruction variable */
	static regexString: string;

	private static platformNames: string[];
	private static platforms = [Asm6502, Asm65C816, AsmZ80_GB];

	/**改变编译平台，目前有 6502 65816 z80-gb */
	static ChangePlatform(platform: string) {

		if (!Platform.platformNames) {
			Platform.platformNames = [];
			for (let i = 0; i < Platform.platforms.length; ++i) {
				let name = Reflect.get(Platform.platforms[i], "platformName");
				Platform.platformNames.push(name);
			}
		}

		let index = Platform.platformNames.indexOf(platform);
		if (index < 0) {
			const errorMsg = Localization.GetMessage("Unsupport platform {0}", platform);
			throw new Error(errorMsg);
		}

		Platform.platform = new Platform.platforms[index]();
		Platform.UpdateRegex();
		IntellisenseProvider.UpdateCommandCompletions();
		IntellisenseProvider.UpdateInstrucionCompletions();
	}

	//#region 更新编译平台的正则表达式
	private static UpdateRegex() {

		Platform.regexString = `((\\s+|^)((?<${MatchNames.command}>`;
		let temp: string;
		Commands.allCommandNames.forEach((value) => {
			temp = Utils.TransformRegex(value) + "|";
			Platform.regexString += temp;
		});

		Platform.regexString = Platform.regexString.substring(0, Platform.regexString.length - 1);
		Platform.regexString += ")|";

		Platform.regexString += `(?<${MatchNames.instruction}>`;
		let instructions = Platform.platform.instructions;
		for (let i = 0; i < instructions.length; ++i) {
			temp = Utils.TransformRegex(instructions[i]) + "|";
			Platform.regexString += temp;
		}

		Platform.regexString = Platform.regexString.substring(0, Platform.regexString.length - 1);
		Platform.regexString += `))(\\s+|$))|(?<${MatchNames.variable}>\\=)`;
	}
	//#endregion 更新编译平台的正则表达式

}