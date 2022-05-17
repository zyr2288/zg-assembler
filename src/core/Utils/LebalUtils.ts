import { Label, LabelDefinedState, LabelState } from "../Base/Label";
import { OneWord } from "../Base/OneWord";
import { GlobalVar } from "../Base/GlobalVar";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Utils } from "./Utils";
import { LexerUtils } from "./LexerUtils";
import { DataGroup } from "../Base/DataGroup";
import { BaseOption } from "../Base/CompileOption";

export class LebalUtils {

	static get namelessLebal() { return new RegExp(/^[\\+\\-]+$/g); };

	//#region 创建标签
	/**创建标签 */
	static CreateLebal(word: OneWord | undefined, value?: number, comment?: string, option?: BaseOption): Label | undefined {
		if (!word || word.isNull)
			return;

		let lebal: Label = new Label();
		lebal.keyword = word.Copy();
		lebal.word = word;
		lebal.value = value;
		lebal.comment = comment;

		let match = LebalUtils.namelessLebal.exec(word.text);

		//#region 临时标签
		if (match) {
			if (option?.macro) {
				MyException.PushException(word, ErrorType.NamelessLebalNotInMacro, ErrorLevel.Show);
				return;
			}

			if (!LebalUtils.CheckIllegal(word.Substring(match.index + match[0].length), false))
				return;

			lebal.labelScope = LabelState.Temporary;
			let textHash = LebalUtils.GetLebalHash(word.text, word.fileHash, lebal.labelScope);
			switch (match[0][0]) {
				case "+":
					if (!GlobalVar.env.allNamelessLebalDown[word.fileHash])
						GlobalVar.env.allNamelessLebalDown[word.fileHash] = {};

					if (GlobalVar.env.allNamelessLebalDown[word.fileHash][textHash]) {
						lebal = GlobalVar.env.allNamelessLebalDown[word.fileHash][textHash];
					} else {
						GlobalVar.env.allNamelessLebalDown[word.fileHash][textHash] = lebal;
					}
					LebalUtils.NamelessSort(word.lineNumber, lebal, false);
					break;
				case "-":
					if (!GlobalVar.env.allNamelessLebalUp[word.fileHash])
						GlobalVar.env.allNamelessLebalUp[word.fileHash] = {};

					if (GlobalVar.env.allNamelessLebalUp[word.fileHash][textHash]) {
						lebal = GlobalVar.env.allNamelessLebalUp[word.fileHash][textHash];
					} else {
						GlobalVar.env.allNamelessLebalUp[word.fileHash][textHash] = lebal;
					}
					LebalUtils.NamelessSort(word.lineNumber, lebal, true);
					break;
			}
			return lebal;
		}
		//#endregion 临时标签

		if (option?.macro) {
			// 不允许使用
			if (!LebalUtils.CheckIllegal(word, false)) {
				MyException.PushException(word, ErrorType.LebalIllegal, ErrorLevel.Show);
				return;
			}

			let hash = LebalUtils.GetLebalHash(word.text, word.fileHash, lebal.labelScope, option);
			if (option.macro.labels[hash] || option.macro.name.text == word.text) {
				MyException.PushException(word, ErrorType.LebalAlreadyDefined, ErrorLevel.Show);
				return;
			}
			option.macro.labels[hash] = lebal;
			return lebal;
		}

		let hash = Utils.GetHashcode(word.text)
		if (GlobalVar.env.allMacro[hash]) {
			MyException.PushException(word, ErrorType.LebalAlreadyDefined, ErrorLevel.Show);
			return;
		}

		lebal.labelScope = LabelState.Global;
		let tempWord = lebal.word;
		if (word.text.startsWith(".")) {
			lebal.labelScope = LabelState.Local;
			tempWord = lebal.word.Substring(1);
		}

		if (tempWord.isNull) {
			MyException.PushException(tempWord, ErrorType.LebalIllegal, ErrorLevel.Show);
			return;
		}

		let result = LebalUtils.SplitLebal(tempWord, lebal.labelScope);
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
	static FindLebal(word: OneWord, option?: BaseOption) {
		let match = LebalUtils.namelessLebal.exec(word.text);
		if (match) {
			let lebals: Record<number, Record<number, Label>> = {};
			let isDown = true;
			switch (match[0][0]) {
				case "+":
					lebals = GlobalVar.env.allNamelessLebalDown;
					break;
				case "-":
					lebals = GlobalVar.env.allNamelessLebalUp;
					isDown = false;
					break;
			}

			let textHash = LebalUtils.GetLebalHash(word.text, word.fileHash, LabelState.Temporary);
			if (!lebals[word.fileHash] || !lebals[word.fileHash][textHash])
				return;

			let lebal = lebals[word.fileHash][textHash];
			let temp: number;
			if (isDown) {
				temp = lebal.lineNumbers.findIndex(value => { return word.lineNumber < value.lineNumber; });
			} else {
				temp = lebal.lineNumbers.findIndex(value => { return word.lineNumber > value.lineNumber; });
			}
			return lebal.GetTemporary(temp);
		}

		if (option?.macro) {
			let hash = Utils.GetHashcode(word.text);
			if (option.macro.labels[hash])
				return option.macro.labels[hash];
		}

		if (word.text.includes(":")) {
			let part = word.Split(/\:/g, 2);
			if (part[0].isNull || part[1].isNull) {
				MyException.PushException(part[0], ErrorType.LebalIllegal, ErrorLevel.Show);
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

			let lebal = LebalUtils._FindLebal(part[0]);
			if (!lebal)
				return;

			let dataGroup: DataGroup = lebal.tag;
			let data = dataGroup.FindData(part[1].text, index);
			if (!data)
				return;

			let result = new Label();
			result.word = data.word.Copy();
			result.labelDefined = LabelDefinedState.Variable;
			result.value = data.index;
			return result;
		}

		return LebalUtils._FindLebal(word);
	}

	static FindTemporaryLebal(lebalWord: OneWord) {
		let match = LebalUtils.namelessLebal.exec(lebalWord.text);
		if (!match)
			return;

		let lebals: Record<number, Record<number, Label>> = {};
		let isDown = true;
		switch (match[0][0]) {
			case "+":
				lebals = GlobalVar.env.allNamelessLebalDown;
				break;
			case "-":
				lebals = GlobalVar.env.allNamelessLebalUp;
				isDown = false;
				break;
		}

		let textHash = LebalUtils.GetLebalHash(lebalWord.text, lebalWord.fileHash, LabelState.Temporary);
		if (!lebals[lebalWord.fileHash] || !lebals[lebalWord.fileHash][textHash])
			return;

		let lebal = lebals[lebalWord.fileHash][textHash];
		return lebal;
	}

	private static _FindLebal(word: OneWord) {
		let tempWord = word;
		let scope = LabelState.Global;
		if (tempWord.text.startsWith(".")) {
			tempWord = word.Substring(1);
			scope = LabelState.Local;
		}

		let hash2 = LebalUtils.GetLebalHash(tempWord.text, word.fileHash, scope);
		return GlobalVar.env.allLebals[hash2];
	}
	//#endregion 查找标签

	//#region 分割Lebal，创建子属性
	/**
	 * 分割Lebal，创建子属性
	 * @param lebalWord Lebal
	 * @param type 作用域
	 * @returns Lebal
	 */
	private static SplitLebal(lebalWord: OneWord, type: LabelState) {
		let words = lebalWord.Split(/\./g);
		let text = "";

		let parentHash = 0;
		if (type == LabelState.Local) {
			parentHash = Utils.GetHashcode(lebalWord.fileHash);
		}

		if (!GlobalVar.env.allLebals[parentHash])
			GlobalVar.env.allLebals[parentHash] = new Label();

		let parent = GlobalVar.env.allLebals[parentHash];
		parent.labelScope = LabelState.AllParent;

		let result: Label | undefined;
		for (let i = 0; i < words.length; i++) {
			if (i != 0)
				text += ".";

			text += words[i].text;
			if (!LebalUtils.CheckIllegal(words[i], true)) {
				MyException.PushException(words[i], ErrorType.LebalIllegal, ErrorLevel.Show);
				return;
			}

			let hash = LebalUtils.GetLebalHash(text, lebalWord.fileHash, type);
			if (GlobalVar.env.allLebals[hash]) {
				if (i == words.length - 1) {
					if (GlobalVar.env.allLebals[hash].labelDefined == LabelDefinedState.Defined) {
						MyException.PushException(words[i], ErrorType.LebalAlreadyDefined, ErrorLevel.Show);
						return;
					}

					GlobalVar.env.allLebals[hash].labelDefined = LabelDefinedState.Defined;
				}

				parentHash = hash;
			} else {
				let tempLebal = new Label();
				tempLebal.word = OneWord.CreateWord(text, lebalWord.fileHash, lebalWord.lineNumber, lebalWord.startColumn);
				tempLebal.keyword = words[i];
				tempLebal.parentHash = parentHash;
				tempLebal.labelDefined = i == words.length - 1 ? LabelDefinedState.Defined : LabelDefinedState.None;

				GlobalVar.env.allLebals[hash] = tempLebal;
				parentHash = hash;
				if (parent && !parent.child[hash]) {
					parent.child[hash] = tempLebal;
				}
			}

			parent = GlobalVar.env.allLebals[hash];
			result = GlobalVar.env.allLebals[hash];

			if (!GlobalVar.env.fileLebals[result.fileHash])
				GlobalVar.env.fileLebals[result.fileHash] = [];

			if (!GlobalVar.env.fileLebals[result.fileHash].includes(hash))
				GlobalVar.env.fileLebals[result.fileHash].push(hash);
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
	static CheckIllegal(word: OneWord, allowDot: boolean) {
		if (allowDot) {
			if (/(^\d)|\s|\+|\-|\*|\/|\>|\<|\=|\!|\~|#|&|\||%|\$/g.test(word.text)) {
				MyException.PushException(word, ErrorType.LebalIllegal, ErrorLevel.Show);
				return false;
			}
		} else {
			if (/(^\d)|\s|\+|\-|\*|\/|\>|\<|\=|\!|\~|#|&|\||%|\$|\./g.test(word.text)) {
				MyException.PushException(word, ErrorType.LebalIllegal, ErrorLevel.Show);
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
	private static GetLebalHash(text: string, fileHash: number, type: LabelState, option?: BaseOption) {
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
	static DeleteLebal(fileHash: number) {
		if (GlobalVar.env.fileLebals[fileHash]) {
			let lebalHashes = GlobalVar.env.fileLebals[fileHash];
			for (let i = 0; i < lebalHashes.length; i++) {
				LebalUtils._DeleteLebal(lebalHashes[i]);
			}

			GlobalVar.env.fileLebals[fileHash] = [];
		}

		GlobalVar.env.allNamelessLebalUp[fileHash] = {};
		GlobalVar.env.allNamelessLebalDown[fileHash] = {};
	}

	private static _DeleteLebal(lebalHash: number) {
		let lebal = GlobalVar.env.allLebals[lebalHash];
		for (let key in lebal.child)
			return;

		delete (GlobalVar.env.allLebals[lebalHash]);

		let parent = GlobalVar.env.allLebals[lebal.parentHash];
		if (parent) {
			delete (parent.child[lebalHash]);
			if (parent.labelScope != LabelState.AllParent)
				LebalUtils._DeleteLebal(lebal.parentHash);
		}
	}
	//#endregion 删除某个文件的标签

}