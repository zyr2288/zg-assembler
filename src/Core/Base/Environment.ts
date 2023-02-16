import { HightlightRange } from "../Lines/CommonLine";
import { ILabel, ILabelTree, INamelessLabelCollection } from "./Label";
import { Macro } from "./Macro";
import { Utils } from "./Utils";

export class Environment {

	/**所有标签 Key: Label的Hash值 */
	allLabel = new Map<number, ILabel>();
	allMacro = new Map<string, Macro>();

	/**临时标签 Key: 文件的fileHash */
	namelessLabel = new Map<number, INamelessLabelCollection>();

	/**标签树，key为 Label的Key，用于记忆标签层集关系 */
	labelTrees = new Map<number, ILabelTree>();
	/**用于记忆文件内macro */
	macroTrees = new Map<number, string[]>();

	/**文件标签，用于记忆文件内的所有标签 */
	fileLabels = new Map<number, Set<number>>();

	macroRegexString = "";

	private files = new Map<number, string>();
	private highlightRanges = new Map<number, HightlightRange[]>();

	GetFile(hash: number) {
		return this.files.get(hash) ?? "";
	}

	SetFile(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		this.files.set(hash, filePath);
		return hash;
	}

	SetRange(fileHash: number, range: HightlightRange) {
		let ranges = this.highlightRanges.get(fileHash);
		if (!ranges) {
			ranges = [];
			this.highlightRanges.set(fileHash, ranges);
		}

		ranges.push(range);
	}

	GetRange(fileHash: number) {
		return this.highlightRanges.get(fileHash) ?? [];
	}

	ClearFileRange(fileHash: number) {
		this.highlightRanges.set(fileHash, []);
	}

	UpdateMacroRegexString() {
		if (this.allMacro.size == 0) {
			this.macroRegexString = "";
			return;
		}

		this.macroRegexString = "(^|\\s+)(?<macro>"
		this.allMacro.forEach((value, key, map) => {
			this.macroRegexString += key + "|";
		});
		this.macroRegexString = this.macroRegexString.substring(0, this.macroRegexString.length - 1);
		this.macroRegexString += ")(\\s+|$)";
	}
}