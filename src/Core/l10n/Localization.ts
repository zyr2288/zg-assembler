import { English } from "./English";
import { Chinese } from "./Zh-cn";

export type LocalizationKey = keyof typeof English;
export type LocalizationMsg = Record<LocalizationKey, string>;

export class Localization {

	private static message: LocalizationMsg = English;

	/**修改显示语言 */
	static ChangeLanguage(localization: string) {
		switch (localization) {
			case "en":
				Localization.message = English;
				break;
			case "zh-cn":
				Localization.message = Chinese;
				break;
		}
	}

	/**获取本地化信息 */
	static GetMessage(msg: LocalizationKey, ...args: string[]) {
		let message = Localization.message[msg];
		for (let i = 0; i < args.length; ++i)
			message = message.replace(`{${i}}`, args[i]);
		
		return message;
	}
}