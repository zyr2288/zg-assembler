import { GlobalVar } from "../Base/GlobalVar";
import { OneWord } from "../Base/OneWord";
import { LebalUtils } from "./LebalUtils";
import { Utils } from "./Utils";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Macro } from "../Base/Macro";
import { BaseLine } from "../Base/BaseLine";
import { LexerUtils } from "./LexerUtils";
import { Compile } from "../Base/Compile";
import { Label, LabelDefinedState } from "../Base/Label";

export class MacroUtils {

	private static macroRegex = "";

	//#region 匹配自定义函数
	static RegexMatch(text: string) {
		if (MacroUtils.macroRegex == "") {
			return null;
		} else {
			return new RegExp(MacroUtils.macroRegex, "g").exec(text);
		}
	};
	//#endregion 匹配自定义函数

	//#region 创建一个自定义函数
	/**
	 * 创建一个自定义函数
	 * @param name 名称
	 * @param params 参数
	 * @returns 创建成功返回macro
	 */
	static CreateMacro(name: OneWord, params: OneWord) {
		if (!LebalUtils.CheckIllegal(name, false)) {
			return;
		}

		let hash = Utils.GetHashcode(name.text);
		if (GlobalVar.env.allLebals[hash] || GlobalVar.env.allMacro[hash]) {
			MyException.PushException(name, ErrorType.LebalAlreadyDefined, ErrorLevel.Show);
			return;
		}

		let macro = new Macro();
		macro.name = name;
		if (!params.isNull) {
			let temp = Utils.SplitComma(params);
			if (temp.success) {
				for (let i = 0; i < temp.parts.length; i++) {
					let part = temp.parts[i];
					var lebal = new Label();
					lebal.word = lebal.keyword = part;
					lebal.labelDefined = LabelDefinedState.Defined;

					let hash = Utils.GetHashcode(part.text);
					if (macro.labels[hash]) {
						MyException.PushException(part, ErrorType.LebalAlreadyDefined, ErrorLevel.Show);
						continue;
					}
					macro.labels[hash] = lebal;
					macro.parameterHash.push(hash);
				}
			}
		}

		GlobalVar.env.allMacro[hash] = macro;
		if (!GlobalVar.env.fileMacro[name.fileHash])
			GlobalVar.env.fileMacro[name.fileHash] = [];

		GlobalVar.env.fileMacro[name.fileHash].push(hash);
		MacroUtils.UpdateMacroRegexStr();
		return macro;
	}
	//#endregion 创建一个自定义函数

	//#region 查找一个自定义函数
	/**
	 * 查找一个自定义函数
	 * @param name 名称
	 * @returns 自定义函数
	 */
	static FindMacro(name: string) {
		let hash = Utils.GetHashcode(name);
		return GlobalVar.env.allMacro[hash];
	}
	//#endregion 查找一个自定义函数

	//#region 删除文件中的Macro
	static DeleteMacro(fileHash: number) {
		if (GlobalVar.env.fileMacro[fileHash]) {
			let macroHashes = GlobalVar.env.fileMacro[fileHash];
			for (let i = 0; i < macroHashes.length; i++) {
				delete (GlobalVar.env.allMacro[macroHashes[i]]);
			}

			GlobalVar.env.fileMacro[fileHash] = [];
			MacroUtils.UpdateMacroRegexStr();
		}

	}
	//#endregion 删除文件中的Macro

	/***** 函数分析 *****/

	//#region 分析自定义函数的参数是否正确
	/**
	 * 分析自定义函数的参数是否正确
	 * @param baseLine 基础行
	 * @returns 
	 */
	static async AnalyseMacro(baseLine: BaseLine) {
		let parts = baseLine.expression.Split(/\s*\,\s*/g);
		let hash = Utils.GetHashcode(baseLine.keyword.text);
		let macro = GlobalVar.env.allMacro[hash];
		if (parts.length != macro.parameterCount) {
			MyException.PushException(baseLine.keyword, ErrorType.ArgumentCountError, ErrorLevel.Show);
			return;
		}

		parts.forEach(value => {
			LexerUtils.GetExpressionValue(value, "check");
		});
	}
	//#endregion 分析自定义函数的参数是否正确

	/***** Private *****/

	//#region 更新自定义函数的正则表达式
	private static UpdateMacroRegexStr() {
		MacroUtils.macroRegex = "(^|\\s+)(";
		let hasElement = false;
		for (let key in GlobalVar.env.allMacro) {
			MacroUtils.macroRegex += `${GlobalVar.env.allMacro[key].name.text}|`;
			hasElement = true;
		}

		if (hasElement) {
			MacroUtils.macroRegex = MacroUtils.macroRegex.substring(0, MacroUtils.macroRegex.length - 1);
			MacroUtils.macroRegex += ")(\\s+|$)";
		} else {
			MacroUtils.macroRegex = "";
		}
	}
	//#endregion 更新自定义函数的正则表达式

}