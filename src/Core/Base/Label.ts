import { Localization } from "../l10n/Localization";
import { Utils } from "../Utils";
import { MyException } from "./MyException";
import { DecodeOption } from "./Options";
import { Token } from "./Token";

export enum LabelState { Global, Local, Temporary, AllParent }
export enum LabelDefinedState { None, Variable, Defined, Label }

export interface ICommonLabel {
	token: Token;
	comment?: string;
	value?: number;
}

/**标签 */
export interface ILabel extends ICommonLabel {
	fileHash: number;
}

/**临时标签 ++ --- */
export interface INamelessLabelCollection {
	upLabels: INamelessLabel[];
	downLabels: INamelessLabel[];
}

export interface INamelessLabel extends ICommonLabel {

}

export interface ILabelTree {

}

export class LabelUtils {

	/**所有标签 Key:labelHash */
	private static allLabel: Map<number, ILabel> = new Map();
	/**Key:fileHash */
	private static namelessLabel: Map<number, INamelessLabelCollection> = new Map();
	/**标签树，用于记忆标签层集关系 */
	private static labelTree = [];

	//#region 创建标签
	static CreateLabel(token: Token, fileHash: number, option: DecodeOption) {
		if (token.isEmpty) return;

		if (/^\++|\-+$/.test(token.text)) {
			if (option?.macro) {
				let errorMsg = Localization.GetMessage("Can not use nameless label in Macro");
				MyException.PushException(token, fileHash, errorMsg);
				return;
			}

			let isDown = token.text[0] == "+";
			return LabelUtils.InsertNamelessLabel(fileHash, token, isDown, option);
		}

		if (option.macro) {
			if (!LabelUtils.CheckIllegal(token, false)) {
				let errorMsg = Localization.GetMessage("Label {0} illegal", token.text);
				MyException.PushException(token, fileHash, errorMsg);
				return;
			}

			let hash = Utils.GetHashcode(token.text);
			if (option.macro.labels.has(hash) || option.macro.name.text == token.text) {
				let errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
				MyException.PushException(token, fileHash, errorMsg);
				return;
			}
		}

		
		let hash = Utils.GetHashcode(token.text);
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
		return newItem;
	}
	//#endregion 插入临时标签

	//#region 检查标签是否合法，true合法
	/**
	 * 检查标签是否合法，true合法
	 * @param word 要检查的文本
	 * @param allowDot 允许逗号
	 * @returns true为合法
	 */
	static CheckIllegal(word: Token, allowDot: boolean) {
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
	private static GetLebalHash(text: string, fileHash: number, type: LabelState, option?: CommonOption) {
		if (option?.macro)
			return Utils.GetHashcode(text);

		switch (type) {
			case LabelState.AllParent:
				return 0;
			case LabelState.Global:
				return Utils.GetHashcode(text);
			case LabelState.Local:
				return Utils.GetHashcode(text, fileHash);
			case LabelState.Temporary:
				return Utils.GetHashcode(text);
		}
	}
	//#endregion 获取标签的Hash值

}