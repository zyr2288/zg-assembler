import { Platform } from "../Platform/Platform";

export class DocumentChangeProvider {

	/**
	 * 指令自动大写
	 * @param lineText 一行内容
	 * @returns 
	 */
	static AutoUpperCase(lineText: string) {
		let match = new RegExp(Platform.regexString, "ig").exec(lineText);
		if (!match?.groups?.["command"] && !match?.groups?.["instruction"])
			return;

		return { index: match.index, length: match[0].length, text: match[0].toUpperCase() };
	}
}
