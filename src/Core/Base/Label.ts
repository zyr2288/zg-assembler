import { Localization } from "../I18n/Localization";
import { Compiler } from "../Compiler/Compiler";
import { ExpressionUtils } from "./ExpressionUtils";
import { MyDiagnostic } from "./MyDiagnostic";
import { Token } from "./Token";
import { Macro } from "./Macro";

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

/**标签作用域 */
export enum LabelScope { Global, Local, Nameless }

export interface ILabelTree {
	parent: string;
	child: Set<string>;
}

export type ILabelCommon = ILabelNormal | ILabelNameless;

/**常规标签 */
export interface ILabelNormal {
	type: LabelType;
	fileIndex: number;
	scope: LabelScope.Global | LabelScope.Local;
	token: Token;
	value?: number;
	comment?: string;
}

export interface ILabelNameless {
	type: LabelType.Label;
	fileIndex: number;
	scope: LabelScope.Nameless;
	token: Token;
	/**用正数负数表示标签的 ++ 和 -- */
	count: number;
	value?: number;
	comment?: string;
}

/**临时标签合集 */
export interface ILabelNamelessCollection {
	/**所有减号临时标签 */
	upLabels: ILabelNameless[];
	/**所有加号临时标签 */
	downLabels: ILabelNameless[];
}

export class LabelUtils {

	/**临时标签匹配用的正则表达式 */
	static get namelessLabelRegex() { return new RegExp(/^((?<plus>\+)|(?<minus>\-))+$/g); };

	//#region 创建通用标签
	/**
	 * 创建通用标签
	 * @param token 标签的Token
	 * @param option.ableNameless 是否允许临时标签，默认允许
	 */
	static CreateCommonLabel(token: Token, option?: { ableNameless?: boolean, comment?: string, macro?: Macro }) {

		// 临时标签
		const match = LabelUtils.namelessLabelRegex.exec(token.text);
		if (match) {
			const able = option?.ableNameless === undefined ? true : option?.ableNameless
			if (!able) {
				const msg = Localization.GetMessage("Label {0} illegal");
				MyDiagnostic.PushException(token, msg);
				return;
			}

			const item = LabelUtils.InsertNamelessLabel(token, option?.comment);
			if (option?.comment)
				item.comment = option.comment;

			return item;
		}

		let allowDot = option?.macro ? false : true;
		if (!LabelUtils.CheckIllegal(token.text, allowDot)) {
			const msg = Localization.GetMessage("Label {0} illegal", token.text);
			MyDiagnostic.PushException(token, msg);
			return;
		}

		// 自定义函数内不允许使用子标签
		if (option?.macro) {
			if (option.macro.labels.has(token.text) || option.macro.name.text === token.text) {
				const errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
				MyDiagnostic.PushException(token, errorMsg, option.macro.fileIndex);
				return;
			}
			const label: ILabelNormal = { type: LabelType.Label, scope: LabelScope.Global, token, fileIndex: 0 };
			option.macro.labels.set(token.text, label);
			return label;
		}

		const label = LabelUtils.SplitLabel(token);
		if (option?.comment && label)
			label.comment = option.comment;

		return label;
	}
	//#endregion 创建通用标签

	//#region 查询标签
	static FindLabel(token: Token, option?: { fileIndex?: number, macro?: Macro }) {
		if (!token || token.isEmpty)
			return;

		// 临时标签
		const match = LabelUtils.namelessLabelRegex.exec(token.text);
		let fileIndex = Compiler.enviroment.fileIndex;
		if (option?.fileIndex !== undefined)
			fileIndex = option.fileIndex;

		if (match) {
			let count = match[0].length;
			const collection = Compiler.enviroment.allLabel.nameless.get(fileIndex);
			if (!collection)
				return;

			if (match.groups?.["minus"]) {
				const labels = collection.upLabels;
				count = -count;
				for (let i = 0; i < labels.length; ++i) {
					if (labels[i].count == count && labels[i].token.line <= token.line)
						return labels[i];
				}
			} else {
				const labels = collection.downLabels;
				for (let i = 0; i < labels.length; ++i) {
					if (labels[i].token.length == count && labels[i].token.line >= token.line)
						return labels[i];
				}
			}
			return;
		}

		//#region 数据组
		if (token.text.includes(":")) {
			const tokens = token.Split(/\:/g);
			if (tokens.length > 3) {
				const msg = Localization.GetMessage("Label {0} illegal");
				MyDiagnostic.PushException(token, msg);
				return;
			}

			const datagroup = Compiler.enviroment.allDataGroup.get(tokens[0].text);
			if (!datagroup) {
				// const errorMsg = Localization.GetMessage("Data group {0} do not found", token.text);
				// MyDiagnostic.PushException(token, errorMsg);
				return;
			}

			let index = 0;
			if (tokens[2] && !tokens[2].isEmpty) {
				const temp = ExpressionUtils.GetNumber(tokens[2].text);
				if (temp.success) {
					index = temp.value;
				} else {
					const errorMsg = Localization.GetMessage("Label {0} not found", tokens[2].text);
					MyDiagnostic.PushException(tokens[2], errorMsg);
					return;
				}
			}

			const data = datagroup.FindData(tokens[1].text, index);
			if (!data)
				return;

			const label: ILabelNormal = { token: data.token, type: LabelType.DataGroup, value: data.index, scope: LabelScope.Global, fileIndex: 0 };
			return label;
		}
		//#endregion 数据组

		if (option?.macro) {
			const param = option.macro.params.get(token.text);
			if (param) {
				return param.label;
			}

			const label = option.macro.labels.get(token.text);
			if (label) {
				return label;
			}
			// macro.params.get(token.text)?.label ?? macro.labels.get(token.text);
		}

		const scope = token.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;
		let label: ILabelNormal | undefined;
		if (scope === LabelScope.Global) {
			label = Compiler.enviroment.allLabel.global.get(token.text);
		} else {
			label = Compiler.enviroment.allLabel.local.get(fileIndex)?.get(token.text);
		}

		return label;

	}
	//#endregion 查询标签

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

	//#region 去除标签后的冒号
	static RemoveColon(token: Token) {
		// 去除最后的冒号
		if (token.text.endsWith(":"))
			return token.Substring(0, token.length - 1);

		return token
	}
	//#endregion 去除标签后的冒号

	/***** private *****/

	//#region 插入临时标签
	/**
	 * 插入临时标签
	 * @param token 标签的Token
	 * @param isDown 是否是向下（加号）
	 * @param option 编译选项
	 * @returns 
	 */
	private static InsertNamelessLabel(token: Token, comment?: string) {

		const fileIndex = Compiler.enviroment.fileIndex;
		const collection = Compiler.enviroment.allLabel.nameless.get(fileIndex) ?? { upLabels: [], downLabels: [] };
		const isDown = token.text[0] === "+";

		const newItem: ILabelNameless = {
			type: LabelType.Label,
			fileIndex,
			scope: LabelScope.Nameless,
			count: isDown ? token.length : -token.length,
			token,
			comment: comment,
		};

		let temp, index = 0;
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
		Compiler.enviroment.allLabel.nameless.set(fileIndex, collection);
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
		let labelMap: Map<string, ILabelNormal> | undefined;
		let labelTreeMap: Map<string, ILabelTree>;

		const fileIndex = Compiler.enviroment.fileIndex;

		if (type === LabelScope.Global) {
			labelMap = Compiler.enviroment.allLabel.global;
			labelTreeMap = Compiler.enviroment.labelTree.global;
			fileLabelSet = Compiler.enviroment.fileLabel.global.get(fileIndex)!;
			if (!fileLabelSet) {
				fileLabelSet = new Set();
				Compiler.enviroment.fileLabel.global.set(fileIndex, fileLabelSet);
			}
		} else {
			labelMap = Compiler.enviroment.allLabel.local.get(fileIndex);
			if (!labelMap) {
				labelMap = new Map<string, ILabelNormal>();
				Compiler.enviroment.allLabel.local.set(fileIndex, labelMap);
			}

			labelTreeMap = Compiler.enviroment.labelTree.local.get(fileIndex)!;
			if (!labelTreeMap) {
				labelTreeMap = new Map();
				Compiler.enviroment.labelTree.local.set(fileIndex, labelTreeMap);
			}
		}

		const lastIndex = tokens.length - 1;

		let tree: ILabelTree | undefined;
		let result: ILabelNormal | undefined;

		for (let index = 0; index < tokens.length; ++index) {
			if (index !== 0)
				text += ".";

			if (tokens[index].isEmpty) {
				const errorMsg = Localization.GetMessage("Label {0} illegal", token.text);
				MyDiagnostic.PushException(token, errorMsg);
				return;
			}

			text += tokens[index].text;
			result = labelMap.get(text);
			if (index === lastIndex) {
				if (result?.type === LabelType.Defined || result?.type === LabelType.Label) {
					let errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
					MyDiagnostic.PushException(token, errorMsg);
					return;
				}

				if (result?.type === LabelType.Variable)
					return result;

				result = {
					token: token.Copy(),
					scope: type,
					type: LabelType.Defined,
					fileIndex: Compiler.enviroment.fileIndex
				};
				result.token.text = text;
				labelMap.set(text, result);
			} else if (!labelMap.has(text)) {
				result = {
					token: token.Copy(),
					scope: type,
					type: LabelType.None,
					fileIndex: Compiler.enviroment.fileIndex
				};
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
		}

		return result;
	}
	//#endregion 分割标签并插入

}