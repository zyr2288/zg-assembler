import { Localization } from "../l10n/Localization";
import { Utils } from "../Utils";
import { MyException } from "./MyException";
import { DecodeOption } from "./Options";
import { Token } from "./Token";

/**标签类型 */
export enum LabelType {
	/**无 */
	None,
	/**变量 */
	Variable,
	/**常量 */
	Defined,
	/**标签 */
	Label
}

enum LabelScope { Global, Local, Temporary, AllParent }

export interface ICommonLabel {
	token: Token;
	comment?: string;
	value?: number;
}

export interface ILabelTree {
	parent: number;
	child: Set<number>;
}

/**标签 */
export interface ILabel extends ICommonLabel {
	labelType: LabelType;
	fileHash: number;
}

/**临时标签 ++ --- */
export interface INamelessLabelCollection {
	upLabels: INamelessLabel[];
	downLabels: INamelessLabel[];
}

export interface INamelessLabel extends ICommonLabel {

}

export class LabelUtils {

	static get namelessLabelRegex() { return new RegExp(/^[\\+\\-]+$/g); };

	/**所有标签 Key: Label的Hash值 */
	private static allLabel = new Map<number, ILabel>();
	/**Key: 文件的fileHash */
	private static namelessLabel = new Map<number, INamelessLabelCollection>();

	/**标签树，key为 Label的Key，用于记忆标签层集关系 */
	private static labelTrees = new Map<number, ILabelTree>();

	/**文件标签，用于记忆文件内的所有标签 */
	private static fileLabels = new Map<number, Set<number>>();

	/** Public */

	//#region 创建标签
	static CreateLabel(token: Token, option: DecodeOption) {
		if (token.isEmpty) return;

		// 判断临时标签
		if (LabelUtils.namelessLabelRegex.test(token.text)) {
			if (option?.macro) {
				let errorMsg = Localization.GetMessage("Can not use nameless label in Macro");
				MyException.PushException(token, option.fileHash, errorMsg);
				return;
			}

			let isDown = token.text[0] == "+";
			LabelUtils.InsertNamelessLabel(option.fileHash, token, isDown, option);
			return;
		}

		if (!LabelUtils.CheckIllegal(token, !!option.macro)) {
			let errorMsg = Localization.GetMessage("Label {0} illegal", token.text);
			MyException.PushException(token, option.fileHash, errorMsg);
			return;
		}

		// 自定义函数内不允许使用子标签
		if (option.macro) {
			let hash = Utils.GetHashcode(token.text);
			if (option.macro.labels.has(hash) || option.macro.name.text == token.text) {
				let errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
				MyException.PushException(token, option.fileHash, errorMsg);
				return;
			}
		}

		let type = token.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;

		let hash = LabelUtils.GetLebalHash(token.text, option.fileHash, type);
		if (LabelUtils.allLabel.has(hash)) {
			let errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
			MyException.PushException(token, option.fileHash, errorMsg);
			return;
		}

		let label = LabelUtils.SplitLabel(token, option.fileHash, type);
		if (label)
			label.comment = option.allLines[option.lineIndex].comment;

		return label;
	}
	//#endregion 创建标签

	//#region 插入临时标签
	private static InsertNamelessLabel(fileHash: number, token: Token, isDown: boolean, option: DecodeOption) {
		let labels = LabelUtils.namelessLabel.get(fileHash);

		let line = option.allLines[option.lineIndex];

		let newItem: INamelessLabel = { token, comment: line.comment };
		if (!labels) {
			labels = { upLabels: [], downLabels: [] };
			LabelUtils.namelessLabel.set(fileHash, labels);
		}

		let index = 0;
		let temp = isDown ? labels.upLabels : labels.downLabels;
		for (; index < temp.length; ++index)
			if (temp[index].token.line < token.line)
				break;

		temp.splice(index, 0, newItem);
		return;
	}
	//#endregion 插入临时标签

	/** Private */

	//#region 分割标签并插入
	private static SplitLabel(token: Token, fileHash: number, type: LabelScope) {
		let tokens = token.Split(/\./);
		let text = "";

		if (!LabelUtils.fileLabels.has(fileHash))
			LabelUtils.fileLabels.set(fileHash, new Set());

		let fileLabelSet = LabelUtils.fileLabels.get(fileHash)!;
		let parentHash = 0;
		if (type == LabelScope.Local)
			parentHash = Utils.GetHashcode(fileHash);

		let parentLabelTree = LabelUtils.labelTrees.get(parentHash);
		if (!parentLabelTree) {
			parentLabelTree = { parent: parentHash, child: new Set() };
			LabelUtils.labelTrees.set(parentHash, parentLabelTree);
		}

		const lastIndex = tokens.length - 1;
		let labelHash = 0;
		let result: ILabel | undefined;

		for (let index = 0; index < tokens.length; ++index) {
			if (index != 0) text += ".";

			if (tokens[index].isEmpty) {
				let errorMsg = Localization.GetMessage("Label {0} illegal", token.text);
				MyException.PushException(token, fileHash, errorMsg);
				return;
			}

			text += tokens[index].text;
			labelHash = LabelUtils.GetLebalHash(text, fileHash, type);
			if (!fileLabelSet.has(labelHash))
				fileLabelSet.add(labelHash);

			// 查找label的trees是否创建
			let labelTree = LabelUtils.labelTrees.get(labelHash);
			if (!labelTree) {
				labelTree = { parent: parentHash, child: new Set() };
				LabelUtils.labelTrees.set(labelHash, labelTree);
			}

			result = LabelUtils.allLabel.get(labelHash);

			//如果是最后一个
			if (index == lastIndex) {
				if (result?.labelType == LabelType.Defined || result?.labelType == LabelType.Label) {
					let errorMsg = Localization.GetMessage("Label {0} is already defined", tokens[index].text);
					MyException.PushException(token, fileHash, errorMsg);
					return;
				}

				result = { token: tokens[index], fileHash, labelType: LabelType.Defined };
				LabelUtils.allLabel.set(labelHash, result);
			} else {
				if (LabelUtils.allLabel.has(labelHash))
					continue;

				result = { token: tokens[index], fileHash, labelType: LabelType.None };
				LabelUtils.allLabel.set(labelHash, result);
			}

			parentLabelTree.child.add(labelHash);
			parentLabelTree = labelTree;
		}

		return result;
	}
	//#endregion 分割标签并插入

	//#region 检查标签是否合法，true合法
	/**
	 * 检查标签是否合法，true合法
	 * @param word 要检查的文本
	 * @param allowDot 允许逗号
	 * @returns true为合法
	 */
	private static CheckIllegal(word: Token, allowDot: boolean) {
		if (allowDot) {
			if (/(^\d)|\s|\+|\-|\*|\/|\>|\<|\=|\!|\~|#|&|\||%|\$/g.test(word.text)) {
				return false;
			}
		} else {
			if (/(^\d)|\s|\+|\-|\*|\/|\>|\<|\=|\!|\~|#|&|\||%|\$|\./g.test(word.text)) {
				return false;
			}
		}
		return true;
	}
	//#endregion 检查标签是否合法，true合法

	//#region 获取标签的Hash值
	/**
	 * 获取标签的Hash值
	 * @param text 文本
	 * @param fileHash 文件Hash
	 * @param type 标签作用域
	 * @param option 选项
	 * @returns Hash值
	 */
	private static GetLebalHash(text: string, fileHash: number, type: LabelScope) {
		switch (type) {
			case LabelScope.AllParent:
				return 0;
			case LabelScope.Global:
				return Utils.GetHashcode(text);
			case LabelScope.Local:
				return Utils.GetHashcode(text, fileHash);
			case LabelScope.Temporary:
				return Utils.GetHashcode(text);
		}
	}
	//#endregion 获取标签的Hash值

}

export interface LabelTreeUtils {

}
