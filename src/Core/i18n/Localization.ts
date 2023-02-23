import { English } from "./English";
import { Chinese } from "./Zh-cn";

type LocalizationKey = keyof typeof English;
export type LocalizationMsg = Record<LocalizationKey, string>;

export class Localization {

	private static message: LocalizationMsg = English;

	/**修改显示语言 */
	static ChangeLanguage(localization: string) {

		const languages = ["en", "zh-cn"];
		const settingLanguages = [English, Chinese];

		let index = languages.indexOf(localization);
		if (index < 0) index = 0;

		Localization.message = settingLanguages[index];
	}

	/**输出信息格式化 */
	static GetMessage(msg: LocalizationKey, ...args: string[]) {
		let message = Localization.message[msg];
		for (let i = 0; i < args.length; ++i)
			message = message.replace(`{${i}}`, args[i]);

		return message;
	}
} 
