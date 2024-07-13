import { Token } from "../Base/Token";
import { Analyser } from "../Compiler/Analyser";

export class DocumentChangeProvider {

	/**
	 * 指令自动大写
	 * @param lineText 一行内容
	 * @returns 
	 */
	static AutoUpperCase(lineText: string) {
		const token = new Token(lineText);
		const match = Analyser.MatchLineCommon(token);

		switch (match.key) {
			case "command":
			case "instruction":
				const matchText = match.content!.main;
				return { index: matchText.start, length: matchText.length, text: matchText.text.toUpperCase() };
			default:
				return;
		}
	}
}