import { Macro, MacroInstance } from "../Commands/Macro";
import { Localization } from "../I18n/Localization";
import { Compiler } from "./Compiler";
import { MyDiagnostic } from "./MyException";
import { DecodeOption } from "./Options";
import { Token } from "./Token";
import { Utils } from "./Utils";

/**全局变量的Hash */
export const TopLabelHash = 0;

/**标签类型 */
export enum LabelType {
	/**无 */
	None,
	/**变量 */
	Variable,
	/**常量 */
	Defined,
	/**标签 */
	Label,
	/**数据组数据 */
	DataGroup,
	/**Macro参数 */
	Parameter,
	/**Macro不定参数 */
	IndefiniteParam
}

export enum LabelScope { Global, Local, Nameless, AllParent }

export interface ILabelTree {
	parent: string;
	child: Set<string>;
}

export type LabelCommon = LabelNameless | LabelNormal;

/**临时标签 ++ --- */
export interface LabelNamelessCollection {
	/**所有减号临时标签 */
	upLabels: LabelNameless[];
	/**所有加号临时标签 */
	downLabels: LabelNameless[];
}

/**常规标签 */
export class LabelNormal {
	token: Token;
	labelType: LabelType = LabelType.None;

	scope: LabelScope.Global | LabelScope.Local = LabelScope.Global;
	value?: number;
	comment?: string;

	constructor(token: Token, option?: { comment?: string, labelType?: LabelType }) {
		this.token = token;
		if (token.text.startsWith("."))
			this.scope = LabelScope.Local;

		this.comment = option?.comment;
		if (option?.labelType)
			this.labelType = option.labelType;
	}
}

/**临时标签 */
export class LabelNameless {
	token: Token;
	labelType = LabelType.Label;

	scope: LabelScope.Nameless = LabelScope.Nameless;
	value?: number;
	comment?: string;

	count: number;

	constructor(token: Token, isDown: boolean, comment?: string) {
		this.token = token;
		this.count = isDown ? this.token.length : -this.token.length;
	}
}

/**标签工具类 */
export class LabelUtils {

	/**临时标签匹配用的正则表达式 */
	static get namelessLabelRegex() { return new RegExp(/^((?<plus>\+)|(?<minus>\-))+$/g); };

	/** Public */

	//#region 创建标签
	/**
	 * 创建标签
	 * @param token 标签Token
	 * @param option 编译选项
	 * @param allowNameless 允许使用临时标签
	 * @returns 返回创建的label和hash
	 */
	static CreateLabel(token: Token | undefined, option: DecodeOption, allowNameless: boolean): LabelCommon | undefined {
		if (!token || token.isEmpty)
			return;

		// 判断临时标签
		if (allowNameless && LabelUtils.namelessLabelRegex.test(token.text)) {
			if (option?.macro) {
				const errorMsg = Localization.GetMessage("Can not use nameless label in Macro");
				MyDiagnostic.PushException(token, errorMsg);
				return;
			}

			const item = LabelUtils.InsertNamelessLabel(token, option);
			return item;
		}

		if (!LabelUtils.CheckIllegal(token.text, !option.macro)) {
			const errorMsg = Localization.GetMessage("Label {0} illegal", token.text);
			MyDiagnostic.PushException(token, errorMsg);
			return;
		}

		// 自定义函数内不允许使用子标签
		if (option.macro) {
			if (option.macro.labels.has(token.text) || option.macro.name.text === token.text) {
				const errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
				MyDiagnostic.PushException(token, errorMsg);
				return;
			}
			const label = new LabelNormal(token);
			option.macro.labels.set(token.text, label);
			return label;
		}

		const type = token.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;
		let tempLabel: LabelNormal | undefined;
		if (type === LabelScope.Local) {
			tempLabel = Compiler.enviroment.allLabel.local.get(token.fileHash)?.get(token.text);
		} else {
			tempLabel = Compiler.enviroment.allLabel.global.get(token.text);
		}

		if (tempLabel || Compiler.enviroment.allMacro.has(token.text)) {
			if (tempLabel?.labelType === LabelType.Variable || tempLabel?.labelType === LabelType.None) {
				// 获取原来的的label存储的fileLabel并删除，添加的新的label
				let labelSet = Compiler.enviroment.fileLabel.global.get(tempLabel.token.fileHash);
				labelSet?.delete(tempLabel.token.text);
				tempLabel.token = token;
				labelSet = Compiler.enviroment.fileLabel.global.get(token.fileHash);
				labelSet?.add(token.text);
				return tempLabel;
			}

			const errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
			MyDiagnostic.PushException(token, errorMsg);
			return;
		}

		// const hash = LabelUtils.GetLebalHash(token.text, token.fileHash, type);
		// const tempLabel = Compiler.enviroment.allLabels.get(hash);
		// if (tempLabel || Compiler.enviroment.allMacro.has(token.text)) {
		// 	if (tempLabel?.labelType === LabelType.Variable || tempLabel?.labelType === LabelType.None) {
		// 		const fileLabelHashes = LabelUtils.GetFileLabelHash(token.fileHash);
		// 		fileLabelHashes.add(hash);
		// 		return { label: tempLabel, hash };
		// 	}

		// 	const errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
		// 	MyDiagnostic.PushException(token, errorMsg);
		// 	return;
		// }

		const label = LabelUtils.SplitLabel(token);
		if (label) {
			label.comment = option.GetCurrectLine().comment;
			return label;
		}
	}
	//#endregion 创建标签

	//#region 查找标签
	/**
	 * 查找标签
	 * @param token 要查找的标签
	 * @param macro 函数
	 * @returns 是否找到标签
	 */
	static FindLabel(token?: Token, macro?: MacroInstance): LabelCommon | undefined {
		if (!token || token.isEmpty)
			return;

		const match = LabelUtils.namelessLabelRegex.exec(token.text);
		if (match) {
			let count = match[0].length;
			const collection = Compiler.enviroment.allLabel.nameless.get(token.fileHash);
			if (!collection) {
				const errorMsg = Localization.GetMessage("Label {0} not found", token.text);
				MyDiagnostic.PushException(token, errorMsg);
				return;
			}

			if (match.groups?.["minus"]) {
				const labels = collection.upLabels;
				count = -count;
				for (let i = 0; i < labels.length; ++i) {
					if (labels[i].count == count && labels[i].token.line < token.line)
						return labels[i];
				}
			} else {
				const labels = collection.downLabels;
				for (let i = 0; i < labels.length; ++i) {
					if (labels[i].token.length == count && labels[i].token.line > token.line)
						return labels[i];
				}
			}

			let errorMsg = Localization.GetMessage("Label {0} not found", token.text);
			MyDiagnostic.PushException(token, errorMsg);
			return;
		}

		// 函数内标签
		if (macro) {
			const label = LabelUtils.FindLabelInMacro(token, macro);
			if (label)
				return label;
		}

		// 数组下标
		// if (token.text.includes(":")) {
		// 	const part = token.Split(/\:/g, { count: 2 });
		// 	if (part[0].isEmpty || part[1].isEmpty) {
		// 		const errorMsg = Localization.GetMessage("Data group {0} do not found", token.text);
		// 		MyDiagnostic.PushException(token, errorMsg);
		// 		return;
		// 	}

		// 	const datagroup = Compiler.enviroment.allDataGroup.get(part[0].text);
		// 	if (!datagroup) {
		// 		const errorMsg = Localization.GetMessage("Data group {0} do not found", token.text);
		// 		MyDiagnostic.PushException(token, errorMsg);
		// 		return;
		// 	}

		// 	let index = 0;
		// 	if (!part[2].isEmpty) {
		// 		const temp = ExpressionUtils.GetNumber(part[2].text);
		// 		if (temp.success) {
		// 			index = temp.value;
		// 		} else {
		// 			const errorMsg = Localization.GetMessage("Label {0} not found", part[2].text);
		// 			MyDiagnostic.PushException(part[2], errorMsg);
		// 			return;
		// 		}
		// 	}

		// 	const data = datagroup.FindData(part[1].text, index);
		// 	if (!data)
		// 		return;

		// 	const label: ILabel = { token: data.token, labelType: LabelType.DataGroup, value: data.index };
		// 	return label;
		// }

		const scope = token.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;
		let label: LabelNormal | undefined;
		if (scope === LabelScope.Global) {
			label = Compiler.enviroment.allLabel.global.get(token.text);
		} else {
			label = Compiler.enviroment.allLabel.local.get(token.fileHash)?.get(token.text);
		}

		return label;
	}
	//#endregion 查找标签

	//#region 查找下标
	static FindSubLabel(main: Token, sub: Token, option?: { third?: Token, macro?: MacroInstance }) {
		if (option?.macro && option.macro.indefiniteParam && option.macro.indefiniteParam) {
			if (sub.text === "length") {
				const label = new LabelNormal(sub);
				label.value = option.macro.indefiniteParam.params.length;
				return label;
			}
		}
	}
	//#endregion 查找下标

	//#region 通过 labelHash 获取 label
	/**
	 * 通过 labelHash 获取 label
	 * @param labelHash labelHash
	 * @param macro 函数
	 * @returns 查找到的Label
	 */
	// static FindLabelWithHash(labelHash?: number, macro?: Macro) {
	// 	if (labelHash === undefined)
	// 		return;

	// 	let label = macro?.labels.get(labelHash);
	// 	if (label)
	// 		return label;

	// 	label = macro?.params.get(labelHash)?.label;
	// 	if (label)
	// 		return label;

	// 	label = Compiler.enviroment.allLabels.get(labelHash);
	// 	return label;
	// }
	//#endregion 通过 labelHash 获取 label

	//#region 获取标签的Hash值
	/**
	 * 获取标签的Hash值
	 * @param text 文本
	 * @param fileHash 文件Hash
	 * @param type 标签作用域
	 * @param line 行号
	 * @returns Hash值
	 */
	static GetLebalHash(text: string, fileHash: number, type: LabelScope, line?: number) {
		switch (type) {
			case LabelScope.AllParent:
				return 0;
			case LabelScope.Global:
				return Utils.GetHashcode(text);
			case LabelScope.Local:
				return Utils.GetHashcode(text, fileHash);
			case LabelScope.Nameless:
				return Utils.GetHashcode(text, fileHash, line!);
		}
	}
	//#endregion 获取标签的Hash值

	//#region 检查标签是否合法，true合法
	/**
	 * 检查标签是否合法，true合法
	 * @param word 要检查的文本
	 * @param allowDot 允许点
	 * @returns true为合法
	 */
	static CheckIllegal(word: string, allowDot: boolean) {
		if (allowDot) {
			if (/(^\d)|\s|\,|\+|\-|\*|\/|\>|\<|\=|\!|\~|:|#|&|\||%|\$|"/g.test(word)) {
				return false;
			}
		} else {
			if (/(^\d)|\s|\,|\+|\-|\*|\/|\>|\<|\=|\!|\~|:|#|&|\||%|\$|"|\./g.test(word)) {
				return false;
			}
		}
		return true;
	}
	//#endregion 检查标签是否合法，true合法

	/** Private */

	//#region 插入临时标签
	/**
	 * 插入临时标签
	 * @param token 标签的Token
	 * @param isDown 是否是向下（加号）
	 * @param option 编译选项
	 * @returns 
	 */
	private static InsertNamelessLabel(token: Token, option: DecodeOption) {
		const collection = Compiler.enviroment.allLabel.nameless.get(token.fileHash) ?? { upLabels: [], downLabels: [] };
		const line = option.GetCurrectLine();
		const isDown = token.text[0] === "+";

		const newItem = new LabelNameless(token, isDown, line.comment);
		newItem.count = isDown ? token.length : -token.length;
		newItem.token = token;

		let temp;
		let index = 0;
		if (isDown) {
			temp = collection.downLabels;
			for (; index < temp.length; ++index)
				if (temp[index].token.line > token.line)
					break;
		} else {
			temp = collection.upLabels;
			for (; index < temp.length; ++index)
				if (temp[index].token.line < token.line)
					break;
		}

		temp.splice(index, 0, newItem);
		Compiler.enviroment.allLabel.nameless.set(token.fileHash, collection);

		// Compiler.enviroment.allLabel.nameless.set(token.fileHash, temp);
		// let fileLabelSet = Compiler.enviroment.fileLabels.get(token.fileHash);
		// if (!fileLabelSet) {
		// 	fileLabelSet = new Set<number>();
		// 	Compiler.enviroment.fileLabels.set(token.fileHash, fileLabelSet);
		// }
		// fileLabelSet.add(hash);
		return newItem;
	}
	//#endregion 插入临时标签

	//#region 分割标签并插入
	/**
	 * 分割标签并插入
	 * @param token 整个标签
	 * @param type 标签作用域
	 * @returns 
	 */
	private static SplitLabel(token: Token) {
		const tokens = token.Split(/\./g);
		let text = "";

		if (tokens[0].isEmpty) {
			tokens.splice(0, 1);
			text += ".";
		}

		const type = token.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;

		let parentName = "";
		let fileLabelSet: Set<string> = new Set();
		let labelMap: Map<string, LabelNormal> | undefined;
		let labelTreeMap: Map<string, ILabelTree>;

		if (type === LabelScope.Global) {
			labelMap = Compiler.enviroment.allLabel.global;
			labelTreeMap = Compiler.enviroment.labelTree.global;
			fileLabelSet = Compiler.enviroment.fileLabel.global.get(token.fileHash)!;
			if (!fileLabelSet) {
				fileLabelSet = new Set();
				Compiler.enviroment.fileLabel.global.set(token.fileHash, fileLabelSet);
			}
		} else {
			labelMap = Compiler.enviroment.allLabel.local.get(token.fileHash);
			if (!labelMap) {
				labelMap = new Map<string, LabelNormal>();
				Compiler.enviroment.allLabel.local.set(token.fileHash, labelMap);
			}

			labelTreeMap = Compiler.enviroment.labelTree.local.get(token.fileHash)!;
			if (!labelTreeMap) {
				labelTreeMap = new Map();
				Compiler.enviroment.labelTree.local.set(token.fileHash, labelTreeMap);
			}
		}


		// let parentLabelTree = Compiler.enviroment.labelTrees.get(parentHash);
		// if (!parentLabelTree) {
		// 	parentLabelTree = { parent: 0, child: new Set() };
		// 	Compiler.enviroment.labelTrees.set(parentHash, parentLabelTree);
		// }

		const lastIndex = tokens.length - 1;

		let tree: ILabelTree | undefined;
		let result: LabelNormal | undefined;

		for (let index = 0; index < tokens.length; ++index) {
			if (index !== 0)
				text += ".";

			if (tokens[index].isEmpty) {
				let errorMsg = Localization.GetMessage("Label {0} illegal", token.text);
				MyDiagnostic.PushException(token, errorMsg);
				return;
			}

			text += tokens[index].text;
			result = labelMap.get(text);
			if (index === lastIndex) {
				if (result?.labelType === LabelType.Defined || result?.labelType === LabelType.Label) {
					let errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
					MyDiagnostic.PushException(token, errorMsg);
					return;
				}

				result = new LabelNormal(token.Copy(), { labelType: LabelType.Defined });
				result.token.text = text;
				labelMap.set(text, result);
			} else if (!labelMap.has(text)) {
				result = new LabelNormal(token.Copy());
				result.token.text = text;
				labelMap.set(text, result);
			}

			if (parentName && tree) {
				tree.child.add(text);
			}

			tree = labelTreeMap.get(text);
			if (!tree) {
				tree = { parent: "", child: new Set() };
				labelTreeMap.set(text, tree);
			}
			tree.parent = parentName;

			if (type === LabelScope.Global) {
				fileLabelSet.add(text);
			}

			parentName = text;
			// labelHash = LabelUtils.GetLebalHash(text, token.fileHash, type);

			// 查找label的trees是否创建
			// let labelTree = Compiler.enviroment.labelTrees.get(labelHash);
			// if (!labelTree) {
			// 	labelTree = { parent: parentHash, child: new Set() };
			// 	Compiler.enviroment.labelTrees.set(labelHash, labelTree);
			// }

			// result = Compiler.enviroment.allLabels.get(labelHash);

			// //如果是最后一个
			// if (index === lastIndex) {
			// 	if (result?.labelType === LabelType.Defined || result?.labelType === LabelType.Label) {
			// 		let errorMsg = Localization.GetMessage("Label {0} is already defined", tokens[index].text);
			// 		MyDiagnostic.PushException(token, errorMsg);
			// 		return;
			// 	}

			// 	result = { token: token.Copy(), labelType: LabelType.Defined };
			// 	result.token.text = text;
			// 	Compiler.enviroment.allLabels.set(labelHash, result);
			// 	fileLabelSet.add(labelHash);
			// } else if (!Compiler.enviroment.allLabels.has(labelHash)) {
			// 	result = { token: token.Copy(), labelType: LabelType.None };
			// 	result.token.text = text;
			// 	Compiler.enviroment.allLabels.set(labelHash, result);
			// }

			// parentHash = labelHash;
			// parentLabelTree.child.add(labelHash);
			// parentLabelTree = labelTree;
		}

		return result;
	}
	//#endregion 分割标签并插入

	//#region 获取文件保存的Labelhash
	/**
	 * 获取文件保存的Labelhash
	 * @param fileHash 文件的Hash
	 * @returns 文件保存label的set
	 */
	// private static GetFileLabelHash(fileHash: number) {
	// 	if (!Compiler.enviroment.fileLabels.has(fileHash))
	// 		Compiler.enviroment.fileLabels.set(fileHash, new Set());

	// 	return Compiler.enviroment.fileLabels.get(fileHash)!;
	// }
	//#endregion 获取文件保存的Labelhash

	//#region 查询Macro内的标签
	private static FindLabelInMacro(token: Token, macro: MacroInstance) {
		return macro.params.get(token.text)?.label ?? macro.labels.get(token.text);
		// 	const parts = token.Split(/\:/g);
		// if (parts.length != 2)

		// const label = macro.params.get(parts[0].text)?.label;
		// if (!label)
		// 	return;

		// if (parts[1].text === "length")
		// 	return label;
	}
	//#endregion 查询Macro内的标签

}