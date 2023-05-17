import { IMacro } from "../Commands/Macro";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { InstructionLine } from "../Lines/InstructionLine";
import { VariableLine } from "../Lines/VariableLine";
import { Compiler } from "./Compiler";
import { ExpressionUtils } from "./ExpressionUtils";
import { MyDiagnostic } from "./MyException";
import { DecodeOption } from "./Options";
import { Token } from "./Token";
import { Utils } from "./Utils";

/**全局变量的Hash	 */
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
	Label
}

export enum LabelScope { Global, Local, Temporary, AllParent }

export interface ICommonLabel {
	token: Token;
	comment?: string;
	value?: number;
	labelType: LabelType;
}

export interface ILabelTree {
	parent: number;
	child: Set<number>;
}

/**标签 */
export interface ILabel extends ICommonLabel {
}

/**临时标签 ++ --- */
export interface INamelessLabelCollection {
	upLabels: INamelessLabel[];
	downLabels: INamelessLabel[];
}

export interface INamelessLabel extends ICommonLabel {
}


/**标签工具类 */
export class LabelUtils {

	static get namelessLabelRegex() { return new RegExp(/^((?<plus>\+)|(?<minus>\-))+$/g); };

	/** Public */

	//#region 设定line的labelToken
	/**设定line的labelToken */
	static GetLineLabelToken(option: DecodeOption, labelType: LabelType = LabelType.Label) {
		const line = option.GetCurrectLine<InstructionLine | VariableLine | CommandLine>();
		if (line.labelToken && line.labelToken.isEmpty === false) {
			let labelMark = LabelUtils.CreateLabel(line.labelToken!, option);
			if (labelMark) {
				labelMark.label.comment = line.comment;
				labelMark.label.labelType = labelType;
				line.labelHash = labelMark.hash;
			}
		}
	}
	//#endregion 设定line的labelToken

	//#region 创建标签
	/**
	 * 创建标签
	 * @param token 标签Token
	 * @param option 编译选项
	 * @returns 返回创建的label和hash
	 */
	static CreateLabel(token: Token, option: DecodeOption): { label: ICommonLabel, hash: number } | undefined {
		if (token.isEmpty)
			return;

		// 判断临时标签
		if (LabelUtils.namelessLabelRegex.test(token.text)) {
			if (option?.macro) {
				let errorMsg = Localization.GetMessage("Can not use nameless label in Macro");
				MyDiagnostic.PushException(token, errorMsg);
				return;
			}

			let isDown = token.text[0] === "+";
			let item = LabelUtils.InsertNamelessLabel(token, isDown, option);
			return item;
		}

		if (!LabelUtils.CheckIllegal(token, !option.macro)) {
			let errorMsg = Localization.GetMessage("Label {0} illegal", token.text);
			MyDiagnostic.PushException(token, errorMsg);
			return;
		}

		// 自定义函数内不允许使用子标签
		if (option.macro) {
			let hash = Utils.GetHashcode(token.text);
			if (option.macro.labels.has(hash) || option.macro.name.text === token.text) {
				let errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
				MyDiagnostic.PushException(token, errorMsg);
				return;
			}
		}

		let type = token.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;

		let hash = LabelUtils.GetLebalHash(token.text, token.fileHash, type);
		let tempLabel = Compiler.enviroment.allLabel.get(hash);
		if (tempLabel || Compiler.enviroment.allMacro.has(token.text)) {
			if (tempLabel?.labelType === LabelType.Variable || tempLabel?.labelType === LabelType.None) {
				let fileLabelHashes = LabelUtils.GetFileLabelHash(token.fileHash);
				fileLabelHashes.add(hash);
				return { label: tempLabel, hash };
			}

			let errorMsg = Localization.GetMessage("Label {0} is already defined", token.text);
			MyDiagnostic.PushException(token, errorMsg);
			return;
		}

		let label = LabelUtils.SplitLabel(token, type);
		if (label) {
			label.comment = option.GetCurrectLine().comment;
			return { label, hash };
		}
	}
	//#endregion 创建标签

	//#region 查找标签
	/**
	 * 查找标签
	 * @param word 要查找的标签
	 * @param option 选项
	 * @returns 是否找到标签
	 */
	static FindLabel(word?: Token, macro?: IMacro): ILabel | undefined {
		if (!word || word.isEmpty)
			return;

		let match = LabelUtils.namelessLabelRegex.exec(word.text);
		if (match) {
			let count = match[0].length;

			let collection = Compiler.enviroment.namelessLabel.get(word.fileHash);
			if (!collection) {
				let errorMsg = Localization.GetMessage("Label {0} not found", word.text);
				MyDiagnostic.PushException(word, errorMsg);
				return;
			}

			if (match.groups?.["minus"]) {
				let labels = collection.upLabels;
				for (let i = 0; i < labels.length; ++i) {
					if (labels[i].token.length == count && labels[i].token.line < word.line)
						return labels[i];
				}
			} else {
				let labels = collection.downLabels;
				for (let i = 0; i < labels.length; ++i) {
					if (labels[i].token.length == count && labels[i].token.line > word.line)
						return labels[i];
				}
			}

			let errorMsg = Localization.GetMessage("Label {0} not found", word.text);
			MyDiagnostic.PushException(word, errorMsg);
			return;
		}

		// 函数内标签
		if (macro) {
			let hash = Utils.GetHashcode(word.text);
			let label = macro.params.get(hash) ?? macro.labels.get(hash);
			if (label)
				return label;
		}

		// 数组下标
		if (word.text.includes(":")) {
			let part = word.Split(/\:/g, { count: 2 });
			if (part[0].isEmpty || part[1].isEmpty) {
				let errorMsg = Localization.GetMessage("Data group {0} do not found", word.text);
				MyDiagnostic.PushException(word, errorMsg);
				return;
			}

			let scope = part[0].text.startsWith(".") ? LabelScope.Local : LabelScope.Global;
			let hash = LabelUtils.GetLebalHash(part[0].text, part[0].fileHash, scope);
			let datagroup = Compiler.enviroment.allDataGroup.get(hash);
			if (!datagroup) {
				let errorMsg = Localization.GetMessage("Data group {0} do not found", word.text);
				MyDiagnostic.PushException(word, errorMsg);
				return;
			}

			let index = 0;
			if (!part[2].isEmpty) {
				let temp = ExpressionUtils.GetNumber(part[2].text);
				if (temp.success) {
					index = temp.value;
				} else {
					let errorMsg = Localization.GetMessage("Label {0} not found", part[2].text);
					MyDiagnostic.PushException(part[2], errorMsg);
					return;
				}
			}

			let value = datagroup.FindData(part[1].text, index);
			let label: ILabel = { token: word, labelType: LabelType.Variable, value };
			return label;
		}

		let scope = word.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;
		let hash = LabelUtils.GetLebalHash(word.text, word.fileHash, scope);
		return Compiler.enviroment.allLabel.get(hash);
	}
	//#endregion 查找标签

	//#region 通过 labelHash 获取 label
	static GetLabelWithHash(labelHash?: number, macro?: IMacro) {
		if (!labelHash)
			return;

		let label = macro?.labels.get(labelHash);
		if (label)
			return label;

		label = Compiler.enviroment.allLabel.get(labelHash);
		return label;
	}
	//#endregion 通过 labelHash 获取 label

	//#region 获取标签的Hash值
	/**
	 * 获取标签的Hash值
	 * @param text 文本
	 * @param fileHash 文件Hash
	 * @param type 标签作用域
	 * @param option 选项
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
			case LabelScope.Temporary:
				return Utils.GetHashcode(text, fileHash, line!);
		}
	}
	//#endregion 获取标签的Hash值

	//#region 检查标签是否合法，true合法
	/**
	 * 检查标签是否合法，true合法
	 * @param word 要检查的文本
	 * @param allowDot 允许逗号
	 * @returns true为合法
	 */
	static CheckIllegal(word: Token, allowDot: boolean) {
		if (allowDot) {
			if (/(^\d)|\s|\,|\+|\-|\*|\/|\>|\<|\=|\!|\~|#|&|\||%|\$|"/g.test(word.text)) {
				return false;
			}
		} else {
			if (/(^\d)|\s|\,|\+|\-|\*|\/|\>|\<|\=|\!|\~|#|&|\||%|\$|"|\./g.test(word.text)) {
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
	 * @param token 
	 * @param isDown 
	 * @param option 
	 * @returns 
	 */
	private static InsertNamelessLabel(token: Token, isDown: boolean, option: DecodeOption) {
		let labels = Compiler.enviroment.namelessLabel.get(token.fileHash);

		const line = option.GetCurrectLine();

		let hash = LabelUtils.GetLebalHash(token.text, token.fileHash, LabelScope.Temporary, token.line);
		let newItem: INamelessLabel = { token, comment: line.comment, labelType: LabelType.Label };
		if (!labels) {
			labels = { upLabels: [], downLabels: [] };
			Compiler.enviroment.namelessLabel.set(token.fileHash, labels);
		}

		let temp;
		let index = 0;
		if (isDown) {
			temp = labels.downLabels;
			for (; index < temp.length; ++index)
				if (temp[index].token.line > token.line)
					break;
		} else {
			temp = labels.upLabels;
			for (; index < temp.length; ++index)
				if (temp[index].token.line < token.line)
					break;
		}

		temp.splice(index, 0, newItem);
		Compiler.enviroment.allLabel.set(hash, newItem);
		let fileLabelSet = Compiler.enviroment.fileLabels.get(token.fileHash);
		if (!fileLabelSet) {
			fileLabelSet = new Set<number>();
			Compiler.enviroment.fileLabels.set(token.fileHash, fileLabelSet);
		}
		fileLabelSet.add(hash);
		return { label: newItem, hash };
	}
	//#endregion 插入临时标签

	//#region 分割标签并插入
	private static SplitLabel(token: Token, type: LabelScope) {
		let tokens = token.Split(/\./g);
		let text = "";

		if (tokens[0].isEmpty) {
			tokens.splice(0, 1);
			text += ".";
		}

		let fileLabelSet = LabelUtils.GetFileLabelHash(token.fileHash);
		let parentHash = 0;
		if (type === LabelScope.Local)
			parentHash = Utils.GetHashcode(token.fileHash);

		let parentLabelTree = Compiler.enviroment.labelTrees.get(parentHash);
		if (!parentLabelTree) {
			parentLabelTree = { parent: 0, child: new Set() };
			Compiler.enviroment.labelTrees.set(parentHash, parentLabelTree);
		}

		const lastIndex = tokens.length - 1;
		let labelHash = 0;
		let result: ILabel | undefined;

		for (let index = 0; index < tokens.length; ++index) {
			if (index != 0)
				text += ".";

			if (tokens[index].isEmpty) {
				let errorMsg = Localization.GetMessage("Label {0} illegal", token.text);
				MyDiagnostic.PushException(token, errorMsg);
				return;
			}

			text += tokens[index].text;
			labelHash = LabelUtils.GetLebalHash(text, token.fileHash, type);
			fileLabelSet.add(labelHash);

			// 查找label的trees是否创建
			let labelTree = Compiler.enviroment.labelTrees.get(labelHash);
			if (!labelTree) {
				labelTree = { parent: parentHash, child: new Set() };
				Compiler.enviroment.labelTrees.set(labelHash, labelTree);
			}

			result = Compiler.enviroment.allLabel.get(labelHash);

			//如果是最后一个
			if (index === lastIndex) {
				if (result?.labelType === LabelType.Defined || result?.labelType === LabelType.Label) {
					let errorMsg = Localization.GetMessage("Label {0} is already defined", tokens[index].text);
					MyDiagnostic.PushException(token, errorMsg);
					return;
				}

				result = { token: tokens[0].Copy(), labelType: LabelType.Defined };
				result.token.text = text;
				Compiler.enviroment.allLabel.set(labelHash, result);
			} else if (!Compiler.enviroment.allLabel.has(labelHash)) {
				result = { token: tokens[0].Copy(), labelType: LabelType.None };
				result.token.text = text;
				Compiler.enviroment.allLabel.set(labelHash, result);
			}

			parentHash = labelHash;
			parentLabelTree.child.add(labelHash);
			parentLabelTree = labelTree;
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
	private static GetFileLabelHash(fileHash: number) {
		if (!Compiler.enviroment.fileLabels.has(fileHash))
			Compiler.enviroment.fileLabels.set(fileHash, new Set());

		return Compiler.enviroment.fileLabels.get(fileHash)!;
	}
	//#endregion 获取文件保存的Labelhash

}