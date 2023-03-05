import { IDataGroup } from "../Commands/DataGroup";
import { IMacro } from "../Commands/Macro";
import { HightlightRange as HighlightRange, ICommonLine } from "../Lines/CommonLine";
import { ILabel, ILabelTree, INamelessLabelCollection, LabelType } from "./Label";
import { Utils } from "./Utils";

export class Environment {

	isCompileEnv: boolean;
	compiling: boolean = false;

	orgAddress: number = -1;
	baseAddress: number = 0;
	addressOffset: number = 0;

	/**所有标签 Key: Label的Hash值 */
	allLabel = new Map<number, ILabel>();
	allMacro = new Map<string, IMacro>();
	/**所有数据组 Key: Label的Hash值 */
	allDataGroup = new Map<number, IDataGroup>();

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
	private highlightRanges = new Map<number, HighlightRange[]>();

	constructor(isCompile: boolean) {
		this.isCompileEnv = isCompile;
	}

	//#region 获取文件Hash
	GetFile(hash: number) {
		return this.files.get(hash) ?? "";
	}
	//#endregion 获取文件Hash

	//#region 设定文件Hash并返回Hash
	SetFile(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		this.files.set(hash, filePath);
		return hash;
	}
	//#endregion 设定文件Hash并返回Hash

	//#region 设定文件内的智能提示区域
	SetRange(fileHash: number, range: HighlightRange) {
		let ranges = this.highlightRanges.get(fileHash);
		if (!ranges) {
			ranges = [];
			this.highlightRanges.set(fileHash, ranges);
		}

		ranges.push(range);
	}
	//#endregion 设定文件内的智能提示区域

	//#region 获取文件内的智能提示区域
	GetRange(fileHash: number) {
		return this.highlightRanges.get(fileHash) ?? [];
	}
	//#endregion 获取文件内的智能提示区域

	//#region 清除文件内的所有标记
	ClearFile(fileHash: number) {
		// 清除高亮范围
		this.highlightRanges.set(fileHash, []);

		// 清除标签记录
		this.namelessLabel.delete(fileHash);
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

		this.allBaseLines.delete(fileHash);
	}

	private ClearLabelTree(labelTreeHash: number) {
		let labelTree = this.labelTrees.get(labelTreeHash);
		if (!labelTree || labelTreeHash === 0)
			return;

		if (labelTree.child.size === 0) {
			this.allLabel.delete(labelTreeHash);
			this.allDataGroup.delete(labelTreeHash);
			this.labelTrees.get(labelTree.parent)?.child.delete(labelTreeHash);
			this.ClearLabelTree(labelTree.parent);
		} else {
			let label = this.allLabel.get(labelTreeHash)!;
			if (label)
				label.labelType = LabelType.None;
		}

	}
	//#endregion 清除文件内的所有标记

	//#region 清除所有标记
	ClearAll() {
		this.orgAddress = -1;
		this.baseAddress = 0;
		this.addressOffset = 0;
		this.allLabel.clear();
		this.allMacro.clear();
		this.allBaseLines.clear();
		this.allDataGroup.clear();
		this.namelessLabel.clear();
		this.fileLabels.clear();
		this.fileMacros.clear();
	}
	//#endregion 清除所有标记

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

}