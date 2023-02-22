import { HightlightRange, ICommonLine } from "../Lines/CommonLine";
import { ILabel, ILabelTree, INamelessLabelCollection, LabelType } from "./Label";
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

	/**文件标签，用于记忆文件内的所有标签 */
	fileLabels = new Map<number, Set<number>>();
	/**用于记忆文件内macro */
	fileMacros = new Map<number, Set<string>>();

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
		// 清除高亮范围
		this.highlightRanges.set(fileHash, []);

		// 清除标签记录
		let labels = this.fileLabels.get(fileHash);
		if (labels) {
			labels.forEach((value) => {
				this.ClearLabelTree(value);
			});
			this.fileLabels.set(fileHash, new Set());
		}

		// 清除文件内的所有的自定义函数
		let macros = this.fileMacros.get(fileHash);
		if (macros) {
			macros.forEach((value) => {
				this.allMacro.delete(value);
			});
			this.fileMacros.set(fileHash, new Set());
		}
	}

	private ClearLabelTree(labelTreeHash: number) {
		let labelTree = this.labelTrees.get(labelTreeHash);
		if (!labelTree || labelTreeHash === 0)
			return;

		if (labelTree.child.size === 0) {
			this.allLabel.delete(labelTreeHash);
			labelTree = this.labelTrees.get(labelTree.parent)!;
			labelTree.child.delete(labelTreeHash);
			this.ClearLabelTree(labelTree.parent);
		} else {
			let label = this.allLabel.get(labelTreeHash)!;
			label.labelType = LabelType.None;
		}

	}
	//#endregion 清除文件内的所有标记

	//#region 更新Macro的正则
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
	//#endregion 更新Macro的正则

	AddAddress(offset: number) {
		this.baseAddress += offset;
		this.orgAddress += offset;
	}
}