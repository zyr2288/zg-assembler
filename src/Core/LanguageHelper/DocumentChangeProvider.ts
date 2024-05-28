import { Compiler } from "../Base/Compiler";
import { Platform } from "../Platform/Platform";

export class DocumentChangeProvider {

	/**
	 * 指令自动大写
	 * @param lineText 一行内容
	 * @returns 
	 */
	static AutoUpperCase(lineText: string) {
		const match = Compiler.MatchLineCommon(lineText);

		switch (match.key) {
			case "command":
			case "instruction":
				const matchText = match.content.main;
				return { index: matchText.start, length: matchText.length, text: matchText.text.toUpperCase() };
			default:
				return;
		}
	}
}
