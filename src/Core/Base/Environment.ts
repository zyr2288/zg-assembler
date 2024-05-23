import { DataGroup } from "../Commands/DataGroup";
import { Macro } from "../Commands/Macro";
import { HighlightRange, ICommonLine } from "../Lines/CommonLine";
import { FileUtils } from "./FileUtils";
import { ILabelTree, LabelNamelessCollection, LabelNormal, LabelType } from "./Label";

export class Environment {

	/**是否是编译环境 */
	isCompileEnv: boolean;
	compiling: boolean = false;

	orgAddress: number = -1;
	baseAddress: number = -1;
	addressOffset: number = 0;

	fileRange = { start: 0, end: 0 };

	allLabel = {
		/**key 标签名称 */
		global: new Map<string, LabelNormal>(),
		/**key1 文件hash  key2 标签名称 */
		local: new Map<number, Map<string, LabelNormal>>(),
		/**key1 文件hash */
		nameless: new Map<number, LabelNamelessCollection>()
	}

	fileLabel = {
		/**Key1是filehash */
		global: new Map<number, Set<string>>()
	}

	/**标签树，用于记录上下级关系 */
	labelTree = {
		/**全局，Key1是标签名称 */
		global: new Map<string, ILabelTree>(),
		/**局部，Key1是文件hash, Key2是标签名称 */
		local: new Map<number, Map<string, ILabelTree>>()
	}

	/**所有自定义函数，Key为函数的名称 */
	allMacro = new Map<string, Macro>();
	/**所有数据组 Key: Label的Hash值 */
	allDataGroup = new Map<string, DataGroup>();

	/**所有编译行 key1:fileHash key2:lineNumber */
	allBaseLines = new Map<number, ICommonLine[]>();

	/**用于记忆文件内macro */
	fileMacros = new Map<number, Set<string>>();

	private files = new Map<number, string>();
	private highlightRanges = new Map<number, HighlightRange[]>();

	/**
	 * 构造函数
	 * @param isCompile 是否是编译环境，true为编译环境
	 */
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
		let hash = FileUtils.GetFilePathHashcode(filePath);
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
		this.allLabel.nameless.delete(fileHash);
		this.allLabel.local.delete(fileHash);

		this.labelTree.local.delete(fileHash);

		const labels = this.fileLabel.global.get(fileHash);
		if (labels) {
			labels.forEach((labelString) => {
				this.ClearGlobalLabelTree(fileHash, labelString);
			});
			this.fileLabel.global.set(fileHash, new Set());
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
		this.highlightRanges.delete(fileHash);
	}

	private ClearGlobalLabelTree(fileHash: number, labelString: string) {
		let labelTree = this.labelTree.global.get(labelString);
		if (!labelTree)
			return;

		if (labelTree.child.size === 0) {
			this.labelTree.global.delete(labelString);
			this.allLabel.global.delete(labelString);
			this.allDataGroup.delete(labelString);
			let parent = this.labelTree.global.get(labelTree.parent);
			if (parent) {
				parent.child.delete(labelString);
				this.ClearGlobalLabelTree(fileHash, labelTree.parent);
			}
		} else {
			const label = this.allLabel.global.get(labelString);
			if (label && label.token.fileHash === fileHash) {
				label.labelType = LabelType.None;
			}
		}



		// let labelTree = this.labelTrees.get(labelTreeHash);
		// if (!labelTree || labelTreeHash === 0)
		// 	return;

		// if (labelTree.child.size === 0) {
		// 	this.allLabels.delete(labelTreeHash);
		// 	this.allDataGroup.delete(labelTreeHash);
		// 	this.labelTrees.get(labelTree.parent)?.child.delete(labelTreeHash);
		// 	let parentLabel = this.allLabels.get(labelTree.parent);
		// 	if (parentLabel && parentLabel.token.fileHash === fileHash)
		// 		this.ClearLabelTree(fileHash, labelTree.parent);
		// } else {
		// 	let label = this.allLabels.get(labelTreeHash)!;
		// 	if (label && label.token.fileHash === fileHash)
		// 		label.labelType = LabelType.None;
		// }
	}
	//#endregion 清除文件内的所有标记

	//#region 清除所有标记
	ClearAll() {
		this.orgAddress = -1;
		this.baseAddress = -1;
		this.fileRange.start = this.fileRange.end = 0;
		this.addressOffset = 0;

		this.allLabel.global.clear();
		this.allLabel.local.clear();
		this.allLabel.nameless.clear();

		this.allMacro.clear();
		this.allDataGroup.clear();
		this.allBaseLines.clear();

		this.fileLabel.global.clear();

		this.fileMacros.clear();
	}
	//#endregion 清除所有标记

}