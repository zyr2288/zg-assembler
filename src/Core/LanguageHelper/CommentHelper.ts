import { Macro } from "../Commands/Macro";
import { Localization, LocalizationTip } from "../I18n/Localization";

export interface CommentOption {
	type: "Comment" | "Code" | "Value";
	isMarkdown?: boolean;
}

export class CommentHelper {
	private static useMarkDown = true;

	//#region 格式化注释
	/**
	 * 格式化注释
	 * @param option 要注释的文本
	 * @returns 
	 */
	static FormatComment(option: { macro?: Macro, comment?: string, value?: number, commadTip?: string }) {
		let result = "";
		if (option.comment !== undefined) {
			result += CommentHelper.useMarkDown ? option.comment.replace(/\n/g, "\n\n") : option.comment;
		}

		if (option.macro) {
			if (result !== "")
				result += CommentHelper.useMarkDown ? "\n\n---\n\n" : "\n";

			if (option.macro.params.size !== 0) {
				result += Localization.GetMessage("paramters");
				option.macro.params.forEach((v) => {
					result += (CommentHelper.useMarkDown ? `\`${v.label.token.text}\`` : v.label.token.text) + ", ";
				});
				result = result.substring(0, result.length - 2);
			}
		}

		if (option.value !== undefined) {
			if (result !== "")
				result += CommentHelper.useMarkDown ? "\n\n---\n\n" : "\n";

			const value = CommentHelper.ConvertValue(option.value);
			if (CommentHelper.useMarkDown) {
				result += "`BIN:` @" + value.bin + "\n\n";
				result += "`DEC:` " + value.dec + "\n\n";
				result += "`HEX:` $" + value.hex;
			} else {
				result += "BIN: @" + value.bin + "\n";
				result += "DEC: " + value.dec + "\n";
				result += "HEX: $" + value.hex;
			}
		}

		if (option.commadTip) {
			const command = option.commadTip.toLowerCase().substring(1);
			const tip = Localization.GetCommandTip(command as any);
			if (CommentHelper.useMarkDown) {
				result += tip.comment.replace(/\n/g, "\n\n");
				result += "\n\n";
				result += CommentHelper.ConvertCodeToMarkdown(tip.format);
				if (tip.exp) {
					result += "\n\n---\n\n" + Localization.GetMessage("example") + "\n\n";
					result += CommentHelper.ConvertCodeToMarkdown(tip.exp);
				}
			} else {
				result += tip.comment;
				result += "\n";
				result += tip.format;
				if (tip.exp) {
					result += "\n\n" + Localization.GetMessage("example") + "\n";
					result += tip.exp;
				}
			}
		}

		return result;
	}
	//#endregion 格式化注释

	/***** private *****/

	//#region 讲结果值运算成其他进制
	/**
	 * 讲结果值运算成其他进制
	 * @param value 要运算的值
	 * @returns 2 10 16进制结果
	 */
	private static ConvertValue(value: number) {
		let result = { bin: "", dec: "", hex: "" };
		let temp = value;
		do {
			let temp2 = (temp & 0xF).toString(2);
			let array = temp2.padStart(4, "0");
			result.bin = " " + array + result.bin;
			temp >>>= 4;
		} while (temp !== 0)
		result.bin = result.bin.substring(1);
		result.dec = value.toString();
		result.hex = value.toString(16).toUpperCase();
		return result;
	}
	//#endregion 讲结果值运算成其他进制

	//#region 将代码转 markdown
	private static ConvertCodeToMarkdown(code: string) {
		let result = "```\n";
		const lines = code.split(/\n/);
		for (let i = 0; i < lines.length; i++)
			result += "    " + lines[i] + "\n";

		result += "```";
		return result;
	}
	//#endregion 将代码转 markdown
}