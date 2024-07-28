import { DataGroup } from "../Command/DataGroup";
import { CommonLine, HighlightRange, LineResult } from "../Lines/CommonLine";
import { FileUtils } from "./FileUtils";
import { ILabelNamelessCollection, ILabelNormal, ILabelTree, LabelType, } from "./Label";
import { Macro } from "./Macro";
import { CompileResult } from "../Compiler/CompileResult";

export interface FileLineInfo {
	fileIndex: number;
	lineNumber: number;
}

export class Enviroment {

	/**当前分析行的文件Index */
	fileIndex = -1;
	/**第几次编译，-1是编辑模式 */
	compileTime = -1;

	allLabel = {
		/**key为标签名称 */
		global: new Map<string, ILabelNormal>(),
		/**key1 文件index  key2 标签名称 */
		local: new Map<number, Map<string, ILabelNormal>>(),
		/**key1 文件index */
		nameless: new Map<number, ILabelNamelessCollection>()
	}

	allMacro = new Map<string, Macro>();
	allDataGroup = new Map<string, DataGroup>();

	fileLabel = {
		/**Key1是filehash */
		global: new Map<number, Set<string>>()
	}
	/**用于记忆文件内macro */
	fileMacros = new Map<number, Set<string>>();

	/**标签树，用于记录上下级关系 */
	labelTree = {
		/**全局，Key1是标签名称 */
		global: new Map<string, ILabelTree>(),
		/**局部，Key1是文件hash, Key2是标签名称 */
		local: new Map<number, Map<string, ILabelTree>>()
	}

	address = { base: 0, org: -1, offset: 0 };

	/**所有编译结果 */
	compileResult = new CompileResult();
	/**所有行，key是fileIndex，CommonLine是以行的index作为索引 */
	allLine = new Map<number, CommonLine[]>();

	/**所有文件路径 */
	private allFiles = {
		fileToIndex: new Map<string, number>(),
		indexToFile: [] as string[]
	};

	/**文件区域，key为fileIndex */
	private highlightRanges = new Map<number, HighlightRange[]>();


	//#region 清除文件内的所有标记
	ClearFile(fileIndex: number) {

		this.allLine.delete(fileIndex);

		// 清除高亮范围
		this.highlightRanges.set(fileIndex, []);

		// 清除标签记录
		this.allLabel.nameless.delete(fileIndex);
		this.allLabel.local.delete(fileIndex);

		this.labelTree.local.delete(fileIndex);

		const labels = this.fileLabel.global.get(fileIndex);
		if (labels) {
			labels.forEach((labelString) => {
				this.ClearGlobalLabelTree(fileIndex, labelString);
			});
			this.fileLabel.global.set(fileIndex, new Set());
		}

		// 清除文件内的所有的自定义函数
		let macros = this.fileMacros.get(fileIndex);
		if (macros) {
			macros.forEach((value) => {
				this.allMacro.delete(value);
			});
			this.fileMacros.set(fileIndex, new Set());
		}

		this.highlightRanges.delete(fileIndex);
	}

	private ClearGlobalLabelTree(fileIndex: number, labelString: string) {
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
				this.ClearGlobalLabelTree(fileIndex, labelTree.parent);
			}
		} else {
			const label = this.allLabel.global.get(labelString);
			const labelStr = this.fileLabel.global.get(fileIndex);
			if (label && labelStr) {
				label.type = LabelType.None;
			}
		}
	}
	//#endregion 清除文件内的所有标记

	//#region 获取文件的Index
	/**
	 * 获取文件的Index
	 * @param filePath 文件路径
	 * @param save 是否保存，默认保存
	 * @returns 文件的Index
	 */
	GetFileIndex(filePath: string, save = true) {
		filePath = FileUtils.ArrangePath(filePath);
		let index = this.allFiles.fileToIndex.get(filePath);
		if (index === undefined) {
			index = -1;
			if (save) {
				index = this.allFiles.fileToIndex.size;
				this.allFiles.fileToIndex.set(filePath, index);
				this.allFiles.indexToFile[index] = filePath;
			}
		}
		return index;
	}

	GetFilePath(fileIndex: number) {
		return this.allFiles.indexToFile[fileIndex];
	}
	//#endregion 获取文件的Index

	//#region 查找行
	SearchLine<T extends CommonLine>(fileIndex: number, index: number) {
		const lines = this.allLine.get(fileIndex);
		if (!lines)
			return;

		return lines[index] as T;
	}
	//#endregion 查找行

	//#region 设定文件内的智能提示区域
	SetRange(range: HighlightRange) {
		const fileIndex = this.fileIndex;
		let ranges = this.highlightRanges.get(fileIndex);
		if (!ranges) {
			ranges = [];
			this.highlightRanges.set(fileIndex, ranges);
		}

		ranges.push(range);
	}
	//#endregion 设定文件内的智能提示区域

	//#region 获取文件内的智能提示区域
	GetRange(fileIndex: number, line: number) {
		const range = this.highlightRanges.get(fileIndex);
		if (!range)
			return;

		for (let i = 0; i < range.length; i++) {
			const r = range[i];
			if (line < r.startLine || line > r.endLine)
				continue;

			return r;
		}
	}
	//#endregion 获取文件内的智能提示区域

	//#region 清除所有标记
	ClearAll() {
		this.address.org = -1;
		this.address.base = 0;
		this.address.offset = 0;

		this.allLabel.global.clear();
		this.allLabel.local.clear();
		this.allLabel.nameless.clear();

		this.allMacro.clear();
		this.allDataGroup.clear();

		this.allLine.clear();
		this.compileResult.ClearAll();

		this.highlightRanges.clear();

		this.fileLabel.global.clear();

		this.fileMacros.clear();
	}
	//#endregion 清除所有标记

}