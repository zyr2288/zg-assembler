import { OneWord } from "./OneWord";

export interface DataGroupPart {
	index: number;
	word: OneWord;
}

export class DataGroup {
	allLebal: DataGroupPart[] = [];

	PushData(word: OneWord) {
		this.allLebal.push({ index: this.allLebal.length, word: word.Copy() });
	}

	FindData(text: string, index: number): DataGroupPart | undefined {
		let all = this.allLebal.filter(value => { return value.word.text == text });
		return all[index];
	}
}