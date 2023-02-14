import { HightlightRange } from "../Lines/CommonLine";
import { ILabel, ILabelTree, INamelessLabelCollection } from "./Label";
import { Utils } from "./Utils";

export class Environment {

	/**所有标签 Key: Label的Hash值 */
	allLabel = new Map<number, ILabel>();

	/**临时标签 Key: 文件的fileHash */
	namelessLabel = new Map<number, INamelessLabelCollection>();

	/**标签树，key为 Label的Key，用于记忆标签层集关系 */
	labelTrees = new Map<number, ILabelTree>();

	/**文件标签，用于记忆文件内的所有标签 */
	fileLabels = new Map<number, Set<number>>();

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
}