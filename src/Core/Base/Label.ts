import { Token } from "./Token";

export interface ILabel {
	fileHash: number;
	token: Token;
}

export class LabelUtils {

	private static allLabel: Map<number, ILabel> = new Map();

	static CreateLabel(token: Token, fileHash: number) {
		if (token.isEmpty) return;

		if (/\++|\-+/.test(token.text))
	}
}