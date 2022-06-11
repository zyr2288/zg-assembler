import { Label, LabelDefinedState, LabelState } from "../Base/Label";
import { Token } from "../Base/Token";
import { GlobalVar } from "../Base/GlobalVar";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Utils } from "./Utils";
import { LexerUtils } from "./LexerUtils";
import { DataGroup } from "../Base/DataGroup";
import { CommonOption } from "../Base/CommonOption";
import { Platform } from "../Platform/Platform";

export class LabelUtils {

	static get namelessLabel() { return new RegExp(/^[\\+\\-]+$/g); };

	//#region 创建标签
	/**创建标签 */
	static CreateLabel(word: Token | undefined, value?: number, comment?: string, option?: CommonOption): Label | undefined {
		if (!word || word.isNull)
			return;

		let lebal: Label = new Label();
		lebal.keyword = word.Copy();
		lebal.word = word;
		lebal.value = value;
		lebal.comment = comment;

		let match = LabelUtils.namelessLabel.exec(word.text);

		//#region 临时标签
		if (match) {
			if (option?.macro) {
				MyException.PushException(word, ErrorType.NamelessLabelNotInMacro, ErrorLevel.Show);
				return;
			}

			if (!LabelUtils.CheckIllegal(word.Substring(match.index + match[0].length), false))
				return;

			lebal.labelScope = LabelState.Temporary;
			let textHash = LabelUtils.GetLebalHash(word.text, word.fileHash, lebal.labelScope);
			switch (match[0][0]) {
				case "+":
					if (!GlobalVar.env.allNamelessLabelDown[word.fileHash])
						GlobalVar.env.allNamelessLabelDown[word.fileHash] = {};

					if (GlobalVar.env.allNamelessLabelDown[word.fileHash][textHash]) {
						lebal = GlobalVar.env.allNamelessLabelDown[word.fileHash][textHash];
					} else {
						GlobalVar.env.allNamelessLabelDown[word.fileHash][textHash] = lebal;
					}
					LabelUtils.NamelessSort(word.lineNumber, lebal, false);
					break;
				case "-":
					if (!GlobalVar.env.allNamelessLabelUp[word.fileHash])
						GlobalVar.env.allNamelessLabelUp[word.fileHash] = {};

					if (GlobalVar.env.allNamelessLabelUp[word.fileHash][textHash]) {
						lebal = GlobalVar.env.allNamelessLabelUp[word.fileHash][textHash];
					} else {
						GlobalVar.env.allNamelessLabelUp[word.fileHash][textHash] = lebal;
					}
					LabelUtils.NamelessSort(word.lineNumber, lebal, true);
					break;
			}
			return lebal;
		}
		//#endregion 临时标签

		if (option?.macro) {
			// 不允许使用
			if (!LabelUtils.CheckIllegal(word, false)) {
				MyException.PushException(word, ErrorType.LabelIllegal, ErrorLevel.Show);
				return;
			}

			let hash = LabelUtils.GetLebalHash(word.text, word.fileHash, lebal.labelScope, option);
			if (option.macro.labels[hash] || option.macro.name.text == word.text) {
				MyException.PushException(word, ErrorType.LabelAlreadyDefined, ErrorLevel.Show);
				return;
			}
			option.macro.labels[hash] = lebal;
			return lebal;
		}

		let hash = Utils.GetHashcode(word.text)
		if (GlobalVar.env.allMacro[hash]) {
			MyException.PushException(word, ErrorType.LabelAlreadyDefined, ErrorLevel.Show);
			return;
		}

		lebal.labelScope = LabelState.Global;
		let tempWord = lebal.word;
		if (word.text.startsWith(".")) {
			lebal.labelScope = LabelState.Local;
			tempWord = lebal.word.Substring(1);
		}

		if (tempWord.isNull) {
			MyException.PushException(tempWord, ErrorType.LabelIllegal, ErrorLevel.Show);
			return;
		}

		let result = LabelUtils.SplitLebal(tempWord, lebal.labelScope);
		if (result) {
			result.value = value;
			result.comment = comment;
		}

		return result;
	}
	//#endregion 创建标签

	//#region 查找标签
	/**
	 * 查找标签
	 * @param word 要查找的标签
	 * @param option 选项
	 * @returns 是否找到标签
	 */
	static FindLabel(word: Token, option?: CommonOption) {
		let match = LabelUtils.namelessLabel.exec(word.text);
		if (match) {
			let lebals: Record<number, Record<number, Label>> = {};
			let isDown = true;
			switch (match[0][0]) {
				case "+":
					lebals = GlobalVar.env.allNamelessLabelDown;
					break;
				case "-":
					lebals = GlobalVar.env.allNamelessLabelUp;
					isDown = false;
					break;
			}

			let textHash = LabelUtils.GetLebalHash(word.text, word.fileHash, LabelState.Temporary);
			if (!lebals[word.fileHash] || !lebals[word.fileHash][textHash])
				return;

			let label = lebals[word.fileHash][textHash];
			let temp: number;
			if (isDown) {
				temp = label.lineNumbers.findIndex(value => { return word.lineNumber < value.lineNumber; });
			} else {
				temp = label.lineNumbers.findIndex(value => { return word.lineNumber > value.lineNumber; });
			}
			let temp2 = label.GetTemporary(temp);
			if (temp2) temp2.labelDefined = LabelDefinedState.Label;
			return temp2;
		}

		if (option?.macro) {
			let hash = Utils.GetHashcode(word.text);
			if (option.macro.labels[hash])
				return option.macro.labels[hash];
		}

		if (word.text.includes(":")) {
			let part = word.Split(/\:/g, 2);
			if (part[0].isNull || part[1].isNull) {
				MyException.PushException(part[0], ErrorType.LabelIllegal, ErrorLevel.Show);
				return;
			}

			let index = 0;
			if (!part[2].isNull) {
				let temp = LexerUtils.GetNumber(part[2].text);
				if (temp.success) {
					index = temp.value;
				} else {
					MyException.PushException(part[2], ErrorType.ArgumentError, ErrorLevel.Show);
					return;
				}
			}

			let lebal = LabelUtils._FindLebal(part[0]);
			if (!lebal)
				return;

			let dataGroup: DataGroup = lebal.tag;
			let data = dataGroup.FindData(part[1].text, index);
			if (!data)
				return;

			let result = new Label();
			result.word = data.token.Copy();
			result.labelDefined = LabelDefinedState.Variable;
			result.value = data.index;
			return result;
		}

		return LabelUtils._FindLebal(word);
	}

	/**查询临时标签 */
	static FindTemporaryLabel(labelWord: Token) {
		let match = LabelUtils.namelessLabel.exec(labelWord.text);
		if (!match)
			return;

		let labels: Record<number, Record<number, Label>> = {};
		switch (match[0][0]) {
			case "+":
				labels = GlobalVar.env.allNamelessLabelDown;
				break;
			case "-":
				labels = GlobalVar.env.allNamelessLabelUp;
				break;
		}

		let textHash = LabelUtils.GetLebalHash(labelWord.text, labelWord.fileHash, LabelState.Temporary);
		if (!labels[labelWord.fileHash] || !labels[labelWord.fileHash][textHash])
			return;

		let label = labels[labelWord.fileHash][textHash];
		return label;
	}

	private static _FindLebal(word: Token) {
		let tempWord = word;
		let scope = LabelState.Global;
		if (tempWord.text.startsWith(".")) {
			tempWord = word.Substring(1);
			scope = LabelState.Local;
		}

		let hash2 = LabelUtils.GetLebalHash(tempWord.text, word.fileHash, scope);
		return GlobalVar.env.allLabels[hash2];
	}
	//#endregion 查找标签

	//#region 分割Lebal，创建子属性
	/**
	 * 分割Lebal，创建子属性
	 * @param lebalWord Lebal
	 * @param type 作用域
	 * @returns Lebal
	 */
	private static SplitLebal(lebalWord: Token, type: LabelState) {
		let words = lebalWord.Split(/\./g);
		let text = "";

		let parentHash = 0;
		if (type == LabelState.Local) {
			parentHash = Utils.GetHashcode(lebalWord.fileHash);
		}

		if (!GlobalVar.env.allLabels[parentHash])
			GlobalVar.env.allLabels[parentHash] = new Label();

		let parent = GlobalVar.env.allLabels[parentHash];
		parent.labelScope = LabelState.AllParent;

		let result: Label | undefined;
		for (let i = 0; i < words.length; i++) {
			if (i != 0)
				text += ".";

			text += words[i].text;
			if (!LabelUtils.CheckIllegal(words[i], true)) {
				MyException.PushException(words[i], ErrorType.LabelIllegal, ErrorLevel.Show);
				return;
			}

			let hash = LabelUtils.GetLebalHash(text, lebalWord.fileHash, type);
			if (GlobalVar.env.allLabels[hash]) {
				if (i == words.length - 1) {
					if (GlobalVar.env.allLabels[hash].labelDefined == LabelDefinedState.Defined) {
						MyException.PushException(words[i], ErrorType.LabelAlreadyDefined, ErrorLevel.Show);
						return;
					}

					GlobalVar.env.allLabels[hash].labelDefined = LabelDefinedState.Defined;
				}

				parentHash = hash;
			} else {
				let tempLebal = new Label();
				tempLebal.word = Token.CreateToken(text, lebalWord.fileHash, lebalWord.lineNumber, lebalWord.startColumn);
				tempLebal.keyword = words[i];
				tempLebal.parentHash = parentHash;
				tempLebal.labelDefined = i == words.length - 1 ? LabelDefinedState.Defined : LabelDefinedState.None;

				GlobalVar.env.allLabels[hash] = tempLebal;
				parentHash = hash;
				if (parent && !parent.child[hash]) {
					parent.child[hash] = tempLebal;
				}
			}

			parent = GlobalVar.env.allLabels[hash];
			result = GlobalVar.env.allLabels[hash];

			if (!GlobalVar.env.fileLabels[result.fileHash])
				GlobalVar.env.fileLabels[result.fileHash] = [];

			if (!GlobalVar.env.fileLabels[result.fileHash].includes(hash))
				GlobalVar.env.fileLabels[result.fileHash].push(hash);
		}
		return result;
	}
	//#endregion 分割Lebal，创建子属性

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
				MyException.PushException(word, ErrorType.LabelIllegal, ErrorLevel.Show);
				return false;
			}
		} else {
			if (/(^\d)|\s|\+|\-|\*|\/|\>|\<|\=|\!|\~|#|&|\||%|\$|\./g.test(word.text)) {
				MyException.PushException(word, ErrorType.LabelIllegal, ErrorLevel.Show);
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

	//#region 临时标签排序
	/**
	 * 临时标签排序
	 * @param lineNumber 标签所在行
	 * @param lebal 标签
	 * @param sortDesc 排序是否是倒叙
	 * @returns 
	 */
	private static NamelessSort(lineNumber: number, lebal: Label, sortDesc: boolean) {
		if (lebal.lineNumbers.length == 0) {
			lebal.lineNumbers.push({ lineNumber });
			return;
		}

		let index;
		for (index = 0; index < lebal.lineNumbers.length; index++) {
			const nos = lebal.lineNumbers[index];
			if (sortDesc) {
				if (lineNumber < nos.lineNumber)
					continue;

				lebal.lineNumbers.splice(index, 0, { lineNumber });
				index = -1;
				break;
			} else {
				if (lineNumber > nos.lineNumber)
					continue;

				lebal.lineNumbers.splice(index, 0, { lineNumber });
				index = -1;
				break;
			}
		}

		if (index != -1) {
			lebal.lineNumbers.push({ lineNumber });
		}
	}
	//#endregion 临时标签排序

	//#region 删除某个文件的标签
	/**
	 * 删除某个文件的标签 自定义函数
	 * @param fileHash 文件Hash
	 * @returns 
	 */
	static DeleteLabel(fileHash: number) {
		if (GlobalVar.env.fileLabels[fileHash]) {
			let lebalHashes = GlobalVar.env.fileLabels[fileHash];
			for (let i = 0; i < lebalHashes.length; i++) {
				LabelUtils._DeleteLebal(lebalHashes[i]);
			}

			GlobalVar.env.fileLabels[fileHash] = [];
		}

		GlobalVar.env.allNamelessLabelUp[fileHash] = {};
		GlobalVar.env.allNamelessLabelDown[fileHash] = {};
	}

	private static _DeleteLebal(lebalHash: number) {
		let lebal = GlobalVar.env.allLabels[lebalHash];
		for (let key in lebal.child)
			return;

		delete (GlobalVar.env.allLabels[lebalHash]);

		let parent = GlobalVar.env.allLabels[lebal.parentHash];
		if (parent) {
			delete (parent.child[lebalHash]);
			if (parent.labelScope != LabelState.AllParent)
				LabelUtils._DeleteLebal(lebal.parentHash);
		}
	}
	//#endregion 删除某个文件的标签

}