import { OneWord } from "../Base/OneWord";
import { GlobalVar } from "../Base/GlobalVar";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { LebalUtils } from "./LebalUtils";
import { Macro } from "../Base/Macro";
import { Config } from "../Base/Config";
import { LabelDefinedState } from "../Base/Label";
import { BaseOption } from "../Base/CompileOption";

//#region 算数优先级
enum PriorityState {
	Level_0_Sure = -1,
	/**标签、数字、字符串 */
	Level_1_LebalOrNumber,
	/**字符串 */
	Level_2_String,
	/**括号 */
	Level_3_Brackets,
	/**非 负 取高位 取低位 */
	Level_4,
	/**乘 除 求余 */
	Level_5,
	/**加 减 */
	Level_6,
	/**左位移 右位移 */
	Level_7_Shift,
	/**大于 小于 大于等于 小于等于 */
	Level_8_Confident1,
	/**等于 不等于 */
	Level_9_Confident2,
	/**& */
	Level_10_And,
	/**^ */
	Level_11_Eor,
	/**| */
	Level_12_Or,
	/**&& */
	Level_13,
	/**|| */
	Level_14,
};
//#endregion 算数优先级

export class LexerUtils {

	/**符号优先级 */
	private static onlyOnePriority: { [key: string]: PriorityState } = {};

	//#region 初始化
	static Initialize() {
		LexerUtils.onlyOnePriority["("] = PriorityState.Level_3_Brackets;
		LexerUtils.onlyOnePriority[")"] = PriorityState.Level_3_Brackets;
		LexerUtils.onlyOnePriority["*"] = PriorityState.Level_5;
		LexerUtils.onlyOnePriority["/"] = PriorityState.Level_5;
		LexerUtils.onlyOnePriority["%"] = PriorityState.Level_5;
		LexerUtils.onlyOnePriority["+"] = PriorityState.Level_6;
		LexerUtils.onlyOnePriority["-"] = PriorityState.Level_6;
		LexerUtils.onlyOnePriority["<<"] = PriorityState.Level_7_Shift;
		LexerUtils.onlyOnePriority[">>"] = PriorityState.Level_7_Shift;
		LexerUtils.onlyOnePriority[">"] = PriorityState.Level_8_Confident1;
		LexerUtils.onlyOnePriority["<"] = PriorityState.Level_8_Confident1;
		LexerUtils.onlyOnePriority[">="] = PriorityState.Level_8_Confident1;
		LexerUtils.onlyOnePriority["<="] = PriorityState.Level_8_Confident1;
		LexerUtils.onlyOnePriority["!="] = PriorityState.Level_9_Confident2;
		LexerUtils.onlyOnePriority["=="] = PriorityState.Level_9_Confident2;
		LexerUtils.onlyOnePriority["&"] = PriorityState.Level_10_And;
		LexerUtils.onlyOnePriority["^"] = PriorityState.Level_11_Eor;
		LexerUtils.onlyOnePriority["|"] = PriorityState.Level_12_Or;
		LexerUtils.onlyOnePriority["&&"] = PriorityState.Level_13;
		LexerUtils.onlyOnePriority["||"] = PriorityState.Level_14;
	}
	//#endregion 初始化

	//#region 获取表达式值
	/**
	 * 获取表达式值
	 * @param expression 表达式
	 * @returns 获取结果
	 */
	static GetExpressionValue(expression: OneWord, analyseOption: "tryValue" | "check" | "getValue", option?: BaseOption) {
		let result = { success: false, value: 0 };

		let temp1 = LexerUtils.ExpressionSplit(expression);
		if (!temp1.success)
			return result;

		if (analyseOption == "check" || analyseOption == "tryValue") {
			result.success = LexerUtils.ExpressionLebalAnalyse(temp1.parts, option);
			if (!result.success || analyseOption == "check")
				return result;
		}

		let temp2 = LexerUtils.LexerSort(temp1.parts);
		if (!temp2.success)
			return result;

		let temp3 = LexerUtils.ExpressionAnalyse(temp2.parts, analyseOption, option);
		return temp3;
	}
	//#endregion 获取表达式值

	//#region 获取表达式的所有值，可使用字符串
	static GetExpressionValues(expression: OneWord, analyseOption: "check" | "getValue", option?: BaseOption) {
		let result = { success: false, values: <number[]>[] };

		let temp1 = LexerUtils.ExpressionSplit(expression, true);
		if (!temp1.success)
			return result;

		if (analyseOption == "check") {
			result.success = LexerUtils.ExpressionLebalAnalyse(temp1.parts, option);
			return result;
		}

		let temp2 = LexerUtils.LexerSort(temp1.parts);
		if (!temp2.success)
			return result;

		let strIndex = LexerUtils.CheckString(temp2.parts);

		if (strIndex < 0) {
			let temp3 = LexerUtils.ExpressionAnalyse(temp2.parts, analyseOption, option);
			result = { success: temp3.success, values: [temp3.value] };
		} else {
			let tempWord = temp2.parts[strIndex].word.Copy();
			let allLex = JSON.stringify(temp2.parts);

			result.values.length = tempWord.length;
			result.success = true;

			for (let i = 0; i < tempWord.length; i++) {
				temp2.parts[strIndex].priority = PriorityState.Level_0_Sure;
				temp2.parts[strIndex].value = tempWord.text.charCodeAt(i);
				let temp3 = LexerUtils.ExpressionAnalyse(temp2.parts, analyseOption, option);
				if (!temp3.success) {
					result.success = false;
					break;
				}

				result.values[i] = temp3.value;
				temp2.parts = JSON.parse(allLex);
			}

		}
		return result;
	}
	//#endregion 获取表达式的所有值，可使用字符串

	//#region 表达式分解
	/**
	 * 表达式分解，是否没有错误，false为有错误
	 * @param expression 表达式
	 * @returns 是否有误，以及表达式各个部分
	 */
	private static ExpressionSplit(expression: OneWord, ableString?: boolean) {
		let result = { success: true, parts: <LexPart[]>[] };
		if (LebalUtils.namelessLebal.test(expression.text)) {
			result.parts.push({ word: expression, priority: PriorityState.Level_1_LebalOrNumber, value: 0 });
			return result;
		}

		ableString = ableString ?? false;

		let regex = new RegExp(/((?<!\\)")|\(|\)|\!=|==|\>\>|\>=|\<\<|\<=|\>|\<|\+|\-|\*|\/|%|&&|&|\|\||\||\^/g);
		let start = 0;
		let hasString = false;

		let matches = expression.GetRegexMatchs(regex);
		for (let i = 0; i < matches.length; i++) {
			const match = matches[i];
			if (start > match.index)
				continue;

			let word1 = expression.Substring(start, match.index - start);
			if (!word1.isNull) {
				result.parts.push({ word: word1, priority: PriorityState.Level_1_LebalOrNumber, value: 0 });
			}

			if (match.text == "\"") {
				let tempIndex = matches.find((value, index) => { return value.text == "\"" && index > start });
				if (!tempIndex) {
					MyException.PushException(expression, ErrorType.StringError, ErrorLevel.Show);
					result.success = false;
					return result;
				}
				let word2 = expression.Substring(match.index + 1, tempIndex.index - match.index - 1);
				if (word2.isNull) {
					MyException.PushException(expression, ErrorType.StringError, ErrorLevel.Show);
					result.success = false;
					return result;
				}

				// 替换转义的引号
				if (word2.text.startsWith("\\\"")) {
					word2.startColumn++;
				}
				word2.text = word2.text.replace("\\\"", "\"");

				let part = { word: word2, priority: PriorityState.Level_2_String, value: 0 };
				if (word2.length == 1) {
					part.value = word2.text.charCodeAt(0);
					part.priority = PriorityState.Level_0_Sure;
				} else if (hasString) {
					MyException.PushException(expression, ErrorType.OnlyOneString, ErrorLevel.Show);
					result.success = false;
					return result;
				}

				result.parts.push(part);
				start = tempIndex.index + 1;
				hasString = true;

			} else {
				let word2 = expression.Substring(match.index, match.text.length);
				result.parts.push({ word: word2, priority: PriorityState.Level_1_LebalOrNumber, value: 0 });
				start = match.index + match.text.length;
			}
		}

		let word2 = expression.Substring(start, expression.length - start);
		if (!word2.isNull) {
			let part1: LexPart = { word: word2, priority: PriorityState.Level_1_LebalOrNumber, value: 0 };
			result.parts.push(part1);
		}

		let isLebal = true;
		let index = 0;
		for (; index < result.parts.length; index++) {
			let now = result.parts[index];
			switch (now.word.text) {
				case "(":
					if (!isLebal) {
						result.success = false;
						break;
					};

					isLebal = true;
					now.priority = LexerUtils.onlyOnePriority[now.word.text];
					break;
				case ")":
					if (isLebal) {
						result.success = false;
						break;
					};

					isLebal = false;
					now.priority = LexerUtils.onlyOnePriority[now.word.text];
					break;
				case ">":
				case "<":
				case "-":
					if (isLebal) {
						now.priority = PriorityState.Level_4;
						isLebal = true;
						break;
					}

					isLebal = true;
					now.priority = LexerUtils.onlyOnePriority[now.word.text];
					break;
				case "!":
					if (isLebal) {
						result.success = false;
						break;
					};

					now.priority = PriorityState.Level_4;
					isLebal = true;
					break;
				case "*":
					if (!isLebal) {
						isLebal = true;
						now.priority = LexerUtils.onlyOnePriority[now.word.text];
						break;
					};

					now.priority = PriorityState.Level_1_LebalOrNumber;
					isLebal = false;
					break;
				case "+":
				case "/":
				case "<<":
				case ">>":
				case "%":
				case "&":
				case "^":
				case "|":
				case ">=":
				case "!=":
				case "==":
				case "&&":
				case "||":
					if (isLebal) {
						result.success = false;
						break;
					};

					isLebal = true;
					now.priority = LexerUtils.onlyOnePriority[now.word.text];
					break;
				default:
					if (!isLebal) {
						result.success = false;
						break;
					};

					isLebal = false;
					break;
			}

			if (!result.success) {
				MyException.PushException(now.word, ErrorType.ExpressionError, ErrorLevel.Show);
				break;
			}
		}
		if (result.success && isLebal) {
			if (index >= result.parts.length)
				index = result.parts.length - 1;

			MyException.PushException(result.parts[index].word, ErrorType.ExpressionError, ErrorLevel.Show);
			result.success = false;
		}

		if (result.success) {
			let left = new OneWord();
			left.text = "(";
			let right = new OneWord();
			right.text = ")";
			result.parts.unshift({ word: left, priority: PriorityState.Level_3_Brackets, value: 0 });
			result.parts.push({ word: right, priority: PriorityState.Level_3_Brackets, value: 0 });
		}
		return result;
	}
	//#endregion 表达式分解

	//#region 表达式变量分析
	private static ExpressionLebalAnalyse(parts: LexPart[], option?: BaseOption) {
		let noError = true;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.priority != PriorityState.Level_1_LebalOrNumber)
				continue;

			if (LexerUtils.GetNumber(part.word.text).success || part.word.text == "*")
				continue;

			let lebal = LebalUtils.FindLebal(part.word, option);
			if (lebal && lebal.labelDefined != LabelDefinedState.None)
				continue;

			if (Config.InProject) {
				MyException.PushException(part.word, ErrorType.UnknowLebal, ErrorLevel.Show);
			}

			noError = false;
		}
		return noError;
	}
	//#endregion 表达式变量分析

	//#region 表达式排序，使用二叉树分析
	/**
	 * 表达式排序，使用二叉树分析
	 * @param lexes 所有部分
	 */
	private static LexerSort(lexes: LexPart[]) {
		let result = { success: true, parts: <LexPart[]>[] };
		let stack: LexPart[] = [];

		for (let i = 0; i < lexes.length; i++) {
			const part = lexes[i];
			switch (part.priority) {
				case PriorityState.Level_0_Sure:
				case PriorityState.Level_1_LebalOrNumber:
				case PriorityState.Level_2_String:
					result.parts.push(part);
					break;
				case PriorityState.Level_3_Brackets:
					if (part.word.text == "(") {
						stack.push(part);
					} else {
						while (true) {
							let lex = stack.pop();
							if (!lex) {
								MyException.PushException(part.word, ErrorType.ExpressionError, ErrorLevel.Show);
								result.success = false;
								break;
							} else if (lex.priority == PriorityState.Level_3_Brackets) {
								break;
							}
							result.parts.push(lex);
						}
					}
					break;
				default:
					while (true) {
						let top = stack.pop();
						if (!top) {
							MyException.PushException(part.word, ErrorType.ExpressionError, ErrorLevel.Show);
							result.success = false;
							break;
						}

						if (part.priority >= top.priority && top.priority != PriorityState.Level_3_Brackets) {
							result.parts.push(top);
							continue;
						}

						stack.push(top);
						stack.push(part);
						break;
					}

					break;
			}

			if (!result.success)
				break;
		}
		if (stack.length != 0) {
			result.success = false;
		}

		return result;
	}
	//#endregion 表达式优先级排序

	//#region 表达式解析
	/**表达式解析 */
	private static ExpressionAnalyse(allParts: LexPart[], analyseOption: "tryValue" | "getValue", option?: BaseOption) {
		const GetPart = (index: number) => {
			if (index < 0 || index >= allParts.length)
				return;

			return allParts[index];
		}

		let lebalUnknow = false;
		let result = { success: true, value: 0 };
		for (let index = 0; index < allParts.length; index++) {
			const element = allParts[index];
			if (element.priority == PriorityState.Level_0_Sure)
				continue;

			if (element.priority < PriorityState.Level_3_Brackets && element.priority >= 0) {
				if (lebalUnknow)
					continue;

				if (element.word.text == "*") {
					element.value = GlobalVar.env.originalAddress;
					element.priority = PriorityState.Level_0_Sure;
					continue;
				}

				let temp = LexerUtils.GetNumber(element.word.text);
				if (temp.success) {
					element.value = temp.value;
					element.priority = PriorityState.Level_0_Sure;
				} else {
					let lebal = LebalUtils.FindLebal(element.word, option);
					if (lebal?.value == undefined) {
						if (analyseOption == "getValue") {
							MyException.PushException(element.word, ErrorType.UnknowLebal, ErrorLevel.AtLastShow);
							result.success = false;
							break;
						}
						lebalUnknow = true;
					} else {
						element.value = lebal.value;
						element.priority = PriorityState.Level_0_Sure;
					}
				}
				continue;
			}

			let pre1 = GetPart(index - 2);
			let pre2 = GetPart(index - 1);
			let operation = element;
			if (element.priority == PriorityState.Level_4) {
				if (!pre2) {
					result.success = false;
					MyException.PushException(element.word, ErrorType.ExpressionError, ErrorLevel.Show);
					break;
				}

				switch (operation.word.text) {
					case "!":
						operation.value = pre2.value != 0 ? 1 : 0;
						break;
					case "-":
						operation.value = -pre2.value;
						break;
					case ">":
						operation.value = (pre2.value & 0xFF00) >> 8
						break;
					case "<":
						operation.value = pre2.value & 0xFF;
						break;
				}
				operation.priority = PriorityState.Level_0_Sure;
				allParts.splice(index - 1, 1);
				index -= 1;
			} else {
				if (!pre1 || !pre2) {
					result.success = false;
					MyException.PushException(element.word, ErrorType.ExpressionError, ErrorLevel.Show);
					break;
				}

				switch (operation.word.text) {
					case "*":
						operation.value = pre1.value * pre2.value;
						break;
					case "/":
						operation.value = pre1.value / pre2.value;
						break;
					case "%":
						operation.value = pre1.value % pre2.value;
						break;
					case "+":
						operation.value = pre1.value + pre2.value;
						break;
					case "-":
						operation.value = pre1.value - pre2.value;
						break;
					case "<<":
						operation.value = pre1.value << pre2.value;
						break;
					case ">>":
						operation.value = pre1.value >> pre2.value;
						break;
					case "==":
						operation.value = pre1.value == pre2.value ? 1 : 0;
						break;
					case "!=":
						operation.value = pre1.value != pre2.value ? 1 : 0;
						break;
					case "&":
						operation.value = pre1.value >> pre2.value;
						break;
					case "^":
						operation.value = pre1.value >> pre2.value;
						break;
					case "|":
						operation.value = pre1.value >> pre2.value;
						break;
					case "&&":
						operation.value = pre1.value && pre2.value;
						break;
					case "||":
						operation.value = pre1.value || pre2.value;
						break;
				}

				operation.priority = PriorityState.Level_0_Sure;
				allParts.splice(index - 2, 2);
				index -= 2;
			}

			if (!result.success)
				break;
		}

		if (lebalUnknow)
			result.success = false;

		if (result.success)
			result.value = allParts[0].value;

		return result;
	}
	//#endregion 表达式解析

	//#region 获取数字
	/**
	 * 获取数字，返回是否是数字
	 * @param number 要检验的文本
	 * @returns 
	 */
	static GetNumber(number: string) {
		let result = { success: false, value: 0 };
		let text = number;
		if (/^\$[0-9a-fA-F]{1,8}$/g.test(text)) {
			text = text.substring(1);
			result.value = parseInt(text, 16);
			result.success = true;
		} else if (/^\-?[0-9]{1,10}\.?[0-9]{0,10}$/g.test(text)) {
			result.value = parseFloat(text);
			result.success = true;
		} else if (/^@[01]{1,32}$/g.test(text)) {
			text = text.substring(1);
			result.value = parseInt(text, 2);
			result.success = true;
		}
		return result;
	}
	//#endregion 获取数字

	//#region 获取字符串
	private static CheckString(parts: LexPart[]) {
		let index = -1
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.priority == PriorityState.Level_2_String) {
				index = i;
				break;
			}

		}
		return index;
	}
	//#endregion 获取字符串

}

export interface LexPart {
	priority: PriorityState;
	word: OneWord;
	value: number;
}

