export enum CompletionType {
	Instruction, Command, Macro, Label, MacroLabel, Folder, File
}

/**智能提示 */
export class Completion {

	static CopyList(all: Completion[], exclude?: string[]) {
		let result: Completion[] = [];
		for (let i = 0; i < all.length; i++) {
			if (exclude?.includes(all[i].showText))
				continue;

			result.push(all[i]);
		}
		return result;
	}

	showText: string = "";
	insertText: string = "";
	index: number = 0;
	comment?: string;
	type?: CompletionType;
	tag?: any;

	Copy() {
		let completion = new Completion();
		completion.showText = this.showText;
		completion.insertText = this.insertText;
		completion.index = this.index;
		completion.comment = this.comment;
		completion.type = this.type;
		return completion;
	}
}