import { CommonOption } from "../Base/CommonOption";
import { GlobalVar } from "../Base/GlobalVar";
import { LabelDefinedState } from "../Base/Label";
import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Token, TokenType } from "../Base/Token";
import { LabelUtils } from "./LabelUtils";

//#region 算数优先级
export enum PriorityState {
	Level_0_Sure = -1,
	/**标签、数字 */
	Level_1_Label,
	/**数字 */
	Level_2_Number,
	/**字符串 */
	Level_3_String,
	/**括号 */
	Level_4_Brackets,
	/**非 负 取高位 取低位 */
	Level_5,
	/**乘 除 求余 */
	Level_6,
	/**加 减 */
	Level_7,
	/**左位移 右位移 */
	Level_8_Shift,
	/**大于 小于 大于等于 小于等于 */
	Level_9_Confident1,
	/**等于 不等于 */
	Level_10_Confident2,
	/**& */
	Level_11_And,
	/**^ */
	Level_12_Eor,
	/**| */
	Level_13_Or,
	/**&& */
	Level_14,
	/**|| */
	Level_15,
};
//#endregion 算数优先级

export interface LexPart {
	priority: PriorityState;
	token: Token;
	value: number;
}

export class LexerUtils {

	/**符号优先级 */
	private static onlyOnePriority: Record<string, PriorityState> = {};

	//#region 初始化
	static Initialize() {
		LexerUtils.onlyOnePriority["("] = PriorityState.Level_4_Brackets;
		LexerUtils.onlyOnePriority[")"] = PriorityState.Level_4_Brackets;
		LexerUtils.onlyOnePriority["*"] = PriorityState.Level_6;
		LexerUtils.onlyOnePriority["/"] = PriorityState.Level_6;
		LexerUtils.onlyOnePriority["%"] = PriorityState.Level_6;
		LexerUtils.onlyOnePriority["+"] = PriorityState.Level_7;
		LexerUtils.onlyOnePriority["-"] = PriorityState.Level_7;
		LexerUtils.onlyOnePriority["<<"] = PriorityState.Level_8_Shift;
		LexerUtils.onlyOnePriority[">>"] = PriorityState.Level_8_Shift;
		LexerUtils.onlyOnePriority[">"] = PriorityState.Level_9_Confident1;
		LexerUtils.onlyOnePriority["<"] = PriorityState.Level_9_Confident1;
		LexerUtils.onlyOnePriority[">="] = PriorityState.Level_9_Confident1;
		LexerUtils.onlyOnePriority["<="] = PriorityState.Level_9_Confident1;
		LexerUtils.onlyOnePriority["!="] = PriorityState.Level_10_Confident2;
		LexerUtils.onlyOnePriority["=="] = PriorityState.Level_10_Confident2;
		LexerUtils.onlyOnePriority["&"] = PriorityState.Level_11_And;
		LexerUtils.onlyOnePriority["^"] = PriorityState.Level_12_Eor;
		LexerUtils.onlyOnePriority["|"] = PriorityState.Level_13_Or;
		LexerUtils.onlyOnePriority["&&"] = PriorityState.Level_14;
		LexerUtils.onlyOnePriority["||"] = PriorityState.Level_15;
	}
	//#endregion 初始化

	//#region 表达式分解与排序，并初步检查是否正确，不检查标签是否存在
	/**
	 * 表达式分解与排序，并初步检查是否正确，不检查标签是否存在
	 * @param expression 表达式
	 * @returns 表达式小节
	 */
	static SplitAndSort(expression: Token): LexPart[] | undefined {
		if (expression.isNull)
			return [];

		let temp = LexerUtils.ExpressionSplit(expression);
		if (!temp.success)
			return;

		temp = LexerUtils.LexerSort(temp.parts);
		if (!temp.success)
			return;

		return temp.parts;
	}
	//#endregion 表达式分解与排序，并初步检查是否正确，不检查标签是否存在

	//#region 检查表达式标签是否存在
	/**
	 * 检查表达式标签是否存在
	 * @param parts 表达式小节
	 * @param option 编译选项
	 * @returns 未找到的Index数组
	 */
	// static CheckLabels(parts: LexPart[], option?: CommonOption) {
	// 	let result: number[] = [];
	// 	for (let i = 0; i < parts.length; i++) {
	// 		const part = parts[i];
	// 		if (part.priority != PriorityState.Level_1_Label)
	// 			continue;

	// 		let temp = LabelUtils.FindLabel(part.token, option);
	// 		if (!temp)
	// 			result.push(i);

	// 	}
	// 	return result;
	// }
	//#endregion 检查表达式标签是否存在

	//#region 分析所有表达式小节并推送错误
	/**
	 * 分析所有表达式小节并推送错误
	 * @param parts 表达式所有小节
	 * @param option 编译选项
	 * @returns 返回true为有错误
	 */
	static CheckLabelsAndShowError(parts: LexPart[], option?: CommonOption) {
		let error = false;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.priority != PriorityState.Level_1_Label)
				continue;

			let temp = LabelUtils.FindLabel(part.token, option);
			if (!temp) {
				MyException.PushException(parts[i].token, ErrorType.UnknowLabel, ErrorLevel.Show);
				error = true;
			} else {
				switch (temp.labelDefined) {
					case LabelDefinedState.Defined:
						part.token.type = TokenType.Defined;
						break;
					case LabelDefinedState.Label:
						part.token.type = TokenType.Label;
						break;
					case LabelDefinedState.Variable:
						part.token.type = TokenType.Variable;
						break;
				}
			}

		}
		return error;
	}
	//#endregion 分析所有表达式小节并推送错误

	//#region 获取表达式的值
	static GetExpressionValue(allParts: LexPart[], analyseOption: "tryValue" | "getValue", option?: CommonOption) {
		const GetPart = (index: number) => {
			if (index < 0 || index >= allParts.length)
				return;

			return allParts[index];
		}

		let labelUnknow = false;
		let result = { success: true, value: 0 };
		for (let index = 0; index < allParts.length; index++) {
			const element = allParts[index];
			if (element.priority == PriorityState.Level_0_Sure)
				continue;

			if (element.priority < PriorityState.Level_4_Brackets && element.priority >= 0) {
				if (labelUnknow)
					continue;

				if (element.token.text == "*") {
					element.value = GlobalVar.env.originalAddress;
					element.priority = PriorityState.Level_0_Sure;
					continue;
				}

				let temp = LexerUtils.GetNumber(element.token.text);
				if (temp.success) {
					element.value = temp.value;
					element.priority = PriorityState.Level_0_Sure;
				} else {
					let label = LabelUtils.FindLabel(element.token, option);
					if (label?.value == undefined) {
						if (analyseOption == "getValue") {
							MyException.PushException(element.token, ErrorType.UnknowLabel, ErrorLevel.AtLastShow);
							result.success = false;
							break;
						}
						labelUnknow = true;
					} else {
						element.value = label.value;
						element.priority = PriorityState.Level_0_Sure;
					}
				}
				continue;
			}

			let pre1 = GetPart(index - 2);
			let pre2 = GetPart(index - 1);
			let operation = element;
			if (element.priority == PriorityState.Level_5) {
				if (!pre2) {
					result.success = false;
					MyException.PushException(element.token, ErrorType.ExpressionError, ErrorLevel.Show);
					break;
				}

				switch (operation.token.text) {
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
					MyException.PushException(element.token, ErrorType.ExpressionError, ErrorLevel.Show);
					break;
				}

				switch (operation.token.text) {
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

		if (labelUnknow)
			result.success = false;

		if (result.success)
			result.value = allParts[0].value;

		return result;
	}
	//#endregion 获取表达式的值

	//#region 获取包含字符串的表达式值
	/**
	 * 获取包含字符串的表达式值
	 * @param parts 小节
	 * @param option 选项
	 * @returns 结果
	 */
	static GetExpressionValues(parts: LexPart[], option: CommonOption) {
		let strIndex = LexerUtils.CheckString(parts);

		if (strIndex < 0) {
			let temp3 = LexerUtils.GetExpressionValue(parts, "getValue", option);
			return { success: temp3.success, values: [temp3.value] };
		} else {
			let tempWord = parts[strIndex].token.Copy();
			let allLex = JSON.stringify(parts);
			let result = { success: false, values: <number[]>[] };

			result.values.length = tempWord.length;
			result.success = true;

			for (let i = 0; i < tempWord.length; i++) {
				parts[strIndex].priority = PriorityState.Level_0_Sure;
				parts[strIndex].value = tempWord.text.charCodeAt(i);
				let temp3 = LexerUtils.GetExpressionValue(parts, "getValue", option);
				if (!temp3.success) {
					result.success = false;
					break;
				}

				result.values[i] = temp3.value;
				parts = JSON.parse(allLex);
			}
			return result;
		}
	}
	//#endregion 获取包含字符串的表达式值

	//#region 将LexPart转换成Token
	static LexPartsToTokens(parts: LexPart[]) {
		return parts.map(v => v.token);
	}
	//#endregion 将LexPart转换成Token

	//#region 讲一系列LexPart转换成一个Token
	static CombineLexToToken(parts: LexPart[]) {
		let token = new Token();
		let range = { start: 0, end: 0 };
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (i == 0) {
				token.lineNumber = part.token.lineNumber;
				token.fileHash = part.token.fileHash;
				range.start = part.token.startColumn;
				range.end = part.token.startColumn + part.token.text.length;
			} else {
				if (part.token.startColumn < range.start)
					range.start = part.token.startColumn;
				
				let temp = part.token.startColumn + part.token.text.length;
				if (temp > range.end)
					range.end = temp;
			}
		}
		token.text = LexerUtils.FillBlank(range.end - range.start);
		return token;
	}
	//#endregion 讲一系列LexPart转换成一个Token

	/***** Private *****/

	//#region 表达式分解
	/**
	 * 表达式分解，是否没有错误，false为有错误
	 * @param expression 表达式
	 * @returns 是否有误，以及表达式各个部分
	 */
	private static ExpressionSplit(expression: Token) {
		let result = { success: true, parts: <LexPart[]>[] };

		// 临时标签
		if (LabelUtils.namelessLabel.test(expression.text)) {
			result.parts.push({ token: expression, priority: PriorityState.Level_1_Label, value: 0 });
			return result;
		}

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
				result.parts.push({ token: word1, priority: PriorityState.Level_1_Label, value: 0 });
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

				let part = { token: word2, priority: PriorityState.Level_3_String, value: 0 };
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
				result.parts.push({ token: word2, priority: PriorityState.Level_1_Label, value: 0 });
				start = match.index + match.text.length;
			}
		}

		let word2 = expression.Substring(start, expression.length - start);
		if (!word2.isNull) {
			let part1: LexPart = { token: word2, priority: PriorityState.Level_1_Label, value: 0 };
			result.parts.push(part1);
		}

		let isLabel = true;
		let index = 0;
		for (; index < result.parts.length; index++) {
			let now = result.parts[index];
			switch (now.token.text) {
				case "(":
					if (!isLabel) {
						result.success = false;
						break;
					};

					isLabel = true;
					now.priority = LexerUtils.onlyOnePriority[now.token.text];
					break;
				case ")":
					if (isLabel) {
						result.success = false;
						break;
					};

					isLabel = false;
					now.priority = LexerUtils.onlyOnePriority[now.token.text];
					break;
				case ">":
				case "<":
				case "-":
					if (isLabel) {
						now.priority = PriorityState.Level_5;
						isLabel = true;
						break;
					}

					isLabel = true;
					now.priority = LexerUtils.onlyOnePriority[now.token.text];
					break;
				case "!":
					if (isLabel) {
						result.success = false;
						break;
					};

					now.priority = PriorityState.Level_5;
					isLabel = true;
					break;
				case "*":
					if (!isLabel) {
						isLabel = true;
						now.priority = LexerUtils.onlyOnePriority[now.token.text];
						break;
					};

					now.priority = PriorityState.Level_2_Number;
					isLabel = false;
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
					if (isLabel) {
						result.success = false;
						break;
					}

					isLabel = true;
					now.priority = LexerUtils.onlyOnePriority[now.token.text];
					break;
				default:
					if (!isLabel) {
						result.success = false;
						break;
					};

					isLabel = false;
					break;
			}

			if (!result.success) {
				MyException.PushException(now.token, ErrorType.ExpressionError, ErrorLevel.Show);
				break;
			}
		}

		if (result.success && isLabel) {
			if (index >= result.parts.length)
				index = result.parts.length - 1;

			MyException.PushException(result.parts[index].token, ErrorType.ExpressionError, ErrorLevel.Show);
			result.success = false;
		}

		if (result.success) {
			let left = new Token();
			left.text = "(";
			let right = new Token();
			right.text = ")";
			result.parts.unshift({ token: left, priority: PriorityState.Level_4_Brackets, value: 0 });
			result.parts.push({ token: right, priority: PriorityState.Level_4_Brackets, value: 0 });
		}
		return result;
	}
	//#endregion 表达式分解

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
				case PriorityState.Level_1_Label:
				case PriorityState.Level_2_Number:
				case PriorityState.Level_3_String:
					let temp = LexerUtils.GetNumber(part.token.text);
					if (temp.success) {
						part.value = temp.value;
						part.priority = PriorityState.Level_2_Number;
					}
					result.parts.push(part);
					break;
				case PriorityState.Level_4_Brackets:
					if (part.token.text == "(") {
						stack.push(part);
					} else {
						while (true) {
							let lex = stack.pop();
							if (!lex) {
								MyException.PushException(part.token, ErrorType.ExpressionError, ErrorLevel.Show);
								result.success = false;
								break;
							} else if (lex.priority == PriorityState.Level_4_Brackets) {
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
							MyException.PushException(part.token, ErrorType.ExpressionError, ErrorLevel.Show);
							result.success = false;
							break;
						}

						if (part.priority >= top.priority && top.priority != PriorityState.Level_4_Brackets) {
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
	/**检查表达式小节是否包含字符串 */
	private static CheckString(parts: LexPart[]) {
		let index = -1
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.priority == PriorityState.Level_3_String) {
				index = i;
				break;
			}

		}
		return index;
	}
	//#endregion 获取字符串

	//#region 填充空白
	private static FillBlank(length: number) {
		let temp: string[] = [];
		temp.length = length;
		temp.fill(" ");
		return temp.join();
	}
	//#endregion 填充空白

}