import { HightlightRange, ICommonLine } from "../Lines/CommonLine";
import { ILabel, ILabelTree, INamelessLabelCollection } from "./Label";
import { MacroLabel } from "../Commands/Macro";
import { Utils } from "./Utils";

export class Environment {

	orgAddress: number = -1;
	baseAddress: number = 0;
	addressOffset: number = 0;

	/**所有标签 Key: Label的Hash值 */
	allLabel = new Map<number, ILabel>();
	allMacro = new Map<string, MacroLabel>();

	/**所有编译行 */
	allBaseLines = new Map<number, ICommonLine[]>();

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

	//#region 清除文件内的所有标记
	ClearFile(fileHash: number) {
		this.highlightRanges.set(fileHash, []);
		//#region 清除标签记录
		let labels = this.fileLabels.get(fileHash);
		if (labels) {
			labels.forEach((value) => {
				this.allLabel.delete(value);

				let labelTree = this.labelTrees.get(value)!;
				labelTree.child

			});
			this.fileLabels.set(fileHash, new Set());
		}
	}

	private ClearLabelTree(labelTreeHash: number) {
		let labelTree = this.labelTrees.get(labelTreeHash);
		if (!labelTree) return;
		labelTree.parent

	}
	//#endregion 清除文件内的所有标记

	UpdateMacroRegexString() {
		if (this.allMacro.size === 0) {
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

	AddAddress(offset: number) {
		this.baseAddress += offset;
		this.orgAddress += offset;
	}
}