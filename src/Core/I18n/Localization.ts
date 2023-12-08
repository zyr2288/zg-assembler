import { CommandTip_English, English } from "./English";
import { Chinese, CommandTip_Chinese } from "./Zh-cn";


type LocalizationMsgKey = keyof typeof English;
type LocalizationTipKey = keyof typeof CommandTip_English;

export type LocalizationMsg = Record<LocalizationMsgKey, typeof English[LocalizationMsgKey]>;
export type LocalizationTip = Record<LocalizationTipKey, { comment: string, format: string, exp?: string }>;

export class Localization {

	private static message: LocalizationMsg = English;
	private static commandTip: LocalizationTip = CommandTip_English;

	/**修改显示语言 */
	static ChangeLanguage(localization: string) {

		Localization.ChangeCommandTip()

		const languages = ["en", "zh-cn"];
		const msgLanguages = [English, Chinese];
		const tipLanguages = [CommandTip_English, CommandTip_Chinese];

		let index = languages.indexOf(localization);
		if (index < 0) index = 0;

		Localization.message = msgLanguages[index];
		Localization.commandTip = tipLanguages[index];
	}

	/**输出信息格式化 */
	static GetMessage(msg: LocalizationMsgKey, ...args: Array<string | number>) {
		let message = Localization.message[msg];
		message = Localization.StringFormat(message, ...args);
		return message;
	}

	static GetCommandTip(command: LocalizationTipKey) {
		return Localization.commandTip[command];
	}

	private static ChangeCommandTip() {
		Localization.CopyValue("macro", "endm");
		Localization.CopyValue("enum", "ende");
	}

	private static CopyValue(key: string, value: string, ...args: string[]) {
		const allTip = [CommandTip_Chinese, CommandTip_English];
		for (let i = 0; i < allTip.length; i++) {
			const tip = allTip[i];
			// @ts-ignore
			tip[value] = tip[key];
		}
	}

	private static StringFormat(text: string, ...args: any[]) {
		for (let i = 0; i < args.length; ++i)
			text = text.replace(`{${i}}`, args[i].toString());

		return text;
	}
} 
