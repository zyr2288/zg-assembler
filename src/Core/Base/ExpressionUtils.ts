import { Localization } from "../I18n/Localization";
import { HighlightToken, HighlightType } from "../Lines/CommonLine";
import { Compiler } from "./Compiler";
import { LabelType, LabelUtils } from "./Label";
import { MyDiagnostic } from "./MyException";
import { DecodeOption } from "./Options";
import { Token } from "./Token";
import { Utils } from "./Utils";

//#region 算数优先级
export enum PriorityType {
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
	Level_14_AndAnd,
	/**|| */
	Level_15_OrOr,
};
//#endregion 算数优先级

//#region 表达式分割
export interface ExpressionPart {
	highlightingType: HighlightType;
	type: PriorityType;
	token: Token;
	value: number;
}
//#endregion 表达式分割

export enum ExpressionResult {
	TryToGetResult, GetResultAndShowError
}

export class ExpressionUtils {

	/**符号优先级 */
	private static onlyOnePriority: Map<string, PriorityType> = new Map();

	//#region 初始化
	static Initialize() {
		ExpressionUtils.onlyOnePriority.set("(", PriorityType.Level_4_Brackets);
		ExpressionUtils.onlyOnePriority.set(")", PriorityType.Level_4_Brackets);
		ExpressionUtils.onlyOnePriority.set("*", PriorityType.Level_6);
		ExpressionUtils.onlyOnePriority.set("/", PriorityType.Level_6);
		ExpressionUtils.onlyOnePriority.set("%", PriorityType.Level_6);
		ExpressionUtils.onlyOnePriority.set("+", PriorityType.Level_7);
		ExpressionUtils.onlyOnePriority.set("-", PriorityType.Level_7);
		ExpressionUtils.onlyOnePriority.set("<<", PriorityType.Level_8_Shift);
		ExpressionUtils.onlyOnePriority.set(">>", PriorityType.Level_8_Shift);
		ExpressionUtils.onlyOnePriority.set(">", PriorityType.Level_9_Confident1);
		ExpressionUtils.onlyOnePriority.set("<", PriorityType.Level_9_Confident1);
		ExpressionUtils.onlyOnePriority.set(">=", PriorityType.Level_9_Confident1);
		ExpressionUtils.onlyOnePriority.set("<=", PriorityType.Level_9_Confident1);
		ExpressionUtils.onlyOnePriority.set("!=", PriorityType.Level_10_Confident2);
		ExpressionUtils.onlyOnePriority.set("==", PriorityType.Level_10_Confident2);
		ExpressionUtils.onlyOnePriority.set("&", PriorityType.Level_11_And);
		ExpressionUtils.onlyOnePriority.set("^", PriorityType.Level_12_Eor);
		ExpressionUtils.onlyOnePriority.set("|", PriorityType.Level_13_Or);
		ExpressionUtils.onlyOnePriority.set("&&", PriorityType.Level_14_AndAnd);
		ExpressionUtils.onlyOnePriority.set("||", PriorityType.Level_15_OrOr);
	}
	//#endregion 初始化

	//#region 表达式分解与排序，并初步检查是否正确，不检查标签是否存在
	/**
	 * 表达式分解与排序，并初步检查是否正确，不检查标签是否存在
	 * @param expression 表达式
	 * @returns 表达式小节，空为有误
	 */
	static SplitAndSort(expression: Token): ExpressionPart[] | undefined {
		if (expression.isEmpty)
			return [];

		let temp = ExpressionUtils.ExpressionSplit(expression);
		if (!temp.success)
			return;

		temp = ExpressionUtils.LexerSort(temp.parts);
		if (!temp.success)
			return;

		return temp.parts;
	}
	//#endregion 表达式分解与排序，并初步检查是否正确，不检查标签是否存在

	//#region 获取数字
	/**获取数字 */
	static GetNumber(number: string) {
		let match = /(^(?<hex>\$[0-9a-fA-F]+)$)|(^(?<decimal>\-?[0-9]+(\.[0-9]+)?)$)|(^(?<bin>\@[01]+)$)/.exec(number);
		let result = { success: !!match, value: 0 };
		if (match?.groups?.hex) {
			number = number.substring(1);
			result.value = parseInt(number, 16);
		} else if (match?.groups?.decimal) {
			result.value = Number(number);
		} else if (match?.groups?.bin) {
			number = number.substring(1);
			result.value = parseInt(number, 2);
		}
		return result;
	}
	//#endregion 获取数字

	//#region 分析所有表达式小节并推送错误
	/**
	 * 分析所有表达式小节并推送错误
	 * @param parts 表达式所有小节
	 * @param option 编译选项
	 * @returns 返回true为有错误
	 */
	static CheckLabelsAndShowError(parts: ExpressionPart[], option?: DecodeOption) {
		let error = false;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.type !== PriorityType.Level_1_Label)
				continue;

			let temp = LabelUtils.FindLabel(part.token, option?.macro);
			if (!temp || temp.labelType === LabelType.None) {
				let errorMsg = Localization.GetMessage("Label {0} not found", parts[i].token.text);
				MyDiagnostic.PushException(parts[i].token, errorMsg);
				error = true;
			} else {
				switch (temp.labelType) {
					case LabelType.Defined:
						part.highlightingType = HighlightType.Defined;
						break;
					case LabelType.Label:
						part.highlightingType = HighlightType.Label;
						break;
					case LabelType.Variable:
						part.highlightingType = HighlightType.Variable;
						break;
				}
			}
		}
		return error;
	}
	//#endregion 分析所有表达式小节并推送错误

	//#region 获取表达式的值
	/**
	 * 获取表达式的值
	 * @param allParts 所有已排列好的运算小节
	 * @param analyseOption 分析选项
	 * @param option 编译选项
	 * @returns 计算结果
	 */
	static GetExpressionValue(allParts: ExpressionPart[], analyseOption: ExpressionResult, option?: DecodeOption) {
		let tempPart = Utils.DeepClone(allParts);
		const GetPart = (index: number) => {
			if (index < 0 || index >= tempPart.length)
				return;

			return tempPart[index];
		}

		let labelUnknow = false;
		let result = { success: true, value: 0 };
		for (let index = 0; index < tempPart.length; index++) {
			const element = tempPart[index];
			if (element.type === PriorityType.Level_0_Sure)
				continue;

			// 用于判断标签等
			if (element.type < PriorityType.Level_4_Brackets && element.type >= 0) {
				if (labelUnknow)
					continue;

				if (element.token.text === "*") {
					element.value = Compiler.enviroment.orgAddress;
					element.type = PriorityType.Level_0_Sure;
					continue;
				}

				let temp = ExpressionUtils.GetNumber(element.token.text);
				if (temp.success) {
					element.value = temp.value;
					element.type = PriorityType.Level_0_Sure;
				} else {
					let label = LabelUtils.FindLabel(element.token, option?.macro);
					if (label?.value === undefined) {
						if (analyseOption === ExpressionResult.GetResultAndShowError) {
							let errorMsg = Localization.GetMessage("Label {0} not found", element.token.text);
							MyDiagnostic.PushException(element.token, errorMsg);
							result.success = false;
							break;
						}
						labelUnknow = true;
					} else {
						element.value = label.value;
						element.type = PriorityType.Level_0_Sure;
					}
				}
				continue;
			}

			let pre1 = GetPart(index - 2);
			let pre2 = GetPart(index - 1);
			let operation = element;
			if (element.type === PriorityType.Level_5) {
				if (!pre2) {
					result.success = false;
					let errorMsg = Localization.GetMessage("Label {0} not found", element.token.text);
					MyDiagnostic.PushException(element.token, errorMsg);
					break;
				}

				switch (operation.token.text) {
					case "!":
						operation.value = pre2.value !== 0 ? 1 : 0;
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
				operation.type = PriorityType.Level_0_Sure;
				tempPart.splice(index - 1, 1);
				index -= 1;
			} else {
				if (!pre1 || !pre2) {
					result.success = false;
					let errorMsg = Localization.GetMessage("Label {0} not found", element.token.text);
					MyDiagnostic.PushException(element.token, errorMsg);
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
						operation.value = pre1.value === pre2.value ? 1 : 0;
						break;
					case "!=":
						operation.value = pre1.value !== pre2.value ? 1 : 0;
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

				operation.type = PriorityType.Level_0_Sure;
				tempPart.splice(index - 2, 2);
				index -= 2;
			}

			if (!result.success)
				break;
		}

		if (labelUnknow)
			result.success = false;

		if (result.success)
			result.value = tempPart[0].value;

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
	static GetExpressionValues(parts: ExpressionPart[], analyseOption: ExpressionResult, option: DecodeOption) {
		let strIndex = ExpressionUtils.CheckString(parts);

		if (strIndex < 0) {
			let temp3 = ExpressionUtils.GetExpressionValue(parts, analyseOption, option);
			return { success: temp3.success, values: [temp3.value] };
		} else {
			let tempWord = parts[strIndex].token.Copy();
			let result = { success: false, values: <number[]>[] };

			result.values.length = tempWord.length;
			result.success = true;

			for (let i = 0; i < tempWord.length; i++) {
				parts[strIndex].type = PriorityType.Level_0_Sure;
				parts[strIndex].value = tempWord.text.charCodeAt(i);
				let temp3 = ExpressionUtils.GetExpressionValue(parts, analyseOption, option);
				if (!temp3.success) {
					result.success = false;
					break;
				}

				result.values[i] = temp3.value;
			}
			return result;
		}
	}
	//#endregion 获取包含字符串的表达式值

	//#region 将所有表达式部分转换成高亮Token
	static GetHighlightingTokens(parts: ExpressionPart[][]) {
		let result: HighlightToken[] = [];
		for (let i = 0; i < parts.length; ++i){
			for (let j = 0; j < parts[i].length; ++j) {
				if (parts[i][j].type === PriorityType.Level_1_Label)
					result.push({ token: parts[i][j].token, type: parts[i][j].highlightingType });
			}
		}


		return result;
	}
	//#endregion 将所有表达式部分转换成高亮Token

	//#region 拼合ExpressionPart成Token
	static CombineExpressionPart(parts: ExpressionPart[]) {
		let tempToken = { start: parts[0].token.start, end: parts[0].token.start + parts[0].token.length };

		for (let i = 1; i < parts.length; ++i) {
			const part = parts[i];
			
			if (part.token.start < tempToken.start)
				tempToken.start = part.token.start;

			let temp = part.token.start + part.token.text.length;
			if (temp > tempToken.end)
				tempToken.end = temp;

		}

		let token = parts[0].token.Copy();
		token.start = tempToken.start;
		token.text = " ";
		token.text = token.text.repeat(tempToken.end - tempToken.start);

		return token;
	}
	//#endregion 拼合ExpressionPart成Token

	/** Private */

	//#region 表达式分解
	/**
	 * 表达式分解，是否没有错误，false为有错误
	 * @param expression 表达式
	 * @returns 是否有误，以及表达式各个部分
	 */
	private static ExpressionSplit(expression: Token) {
		let result = { success: true, parts: <ExpressionPart[]>[] };

		// 临时标签
		if (LabelUtils.namelessLabelRegex.test(expression.text)) {
			result.parts.push({ token: expression, type: PriorityType.Level_1_Label, value: 0, highlightingType: HighlightType.Label });
			return result;
		}

		let regex = /((?<!\\)")|\(|\)|\!=|==|\>\>|\>=|\<\<|\<=|\>|\<|=|\+|\-|\*|\/|%|&&|&|\|\||\||\^/g;

		let tokens = expression.Split(regex, { saveToken: true });
		let isLabel = true;

		let part: ExpressionPart = { type: PriorityType.Level_1_Label, token: {} as Token, value: 0, highlightingType: HighlightType.None };

		let stringStart = -1;

		for (let i = 0; i < tokens.length; ++i) {
			part.token = tokens[i];
			if (part.token.isEmpty)
				continue;

			if (stringStart > 0 && part.token.text != "\"")
				continue;

			switch (part.token.text) {
				case "\"":
					if (stringStart < 0) {
						stringStart = part.token.start;
						continue;
					} else {
						part.token = expression.Substring(stringStart - expression.start + 1, part.token.start - stringStart - 1);
						part.type = PriorityType.Level_3_String;
						stringStart = -1;
						isLabel = false;
					}
					break;
				case "(":
					if (!isLabel) {
						result.success = false;
						break;
					};

					isLabel = true;
					part.type = ExpressionUtils.onlyOnePriority.get(part.token.text)!;
					break;
				case ")":
					if (isLabel) {
						result.success = false;
						break;
					};

					isLabel = false;
					part.type = ExpressionUtils.onlyOnePriority.get(part.token.text)!;
					break;
				case ">":
				case "<":
				case "-":
					if (isLabel) {
						part.type = PriorityType.Level_5;
						isLabel = true;
						break;
					}

					isLabel = true;
					part.type = ExpressionUtils.onlyOnePriority.get(part.token.text)!;
					break;
				case "!":
					if (isLabel) {
						result.success = false;
						break;
					};

					part.type = PriorityType.Level_5;
					isLabel = true;
					break;
				case "*":
					if (!isLabel) {
						isLabel = true;
						part.type = ExpressionUtils.onlyOnePriority.get(part.token.text)!;
						break;
					};

					part.type = PriorityType.Level_2_Number;
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

					part.type = ExpressionUtils.onlyOnePriority.get(part.token.text)!;
					isLabel = true;
					break;
				case "=":
					let errorMsg = Localization.GetMessage("Expression error");
					MyDiagnostic.PushException(part.token, errorMsg);
					result.success = false;
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
				let errorMsg = Localization.GetMessage("Expression error");
				MyDiagnostic.PushException(part.token, errorMsg);
				break;
			}

			result.parts.push(part);
			part = { type: PriorityType.Level_1_Label, token: {} as Token, value: 0, highlightingType: HighlightType.None };
		}

		if (result.success && isLabel) {
			let errorMsg = Localization.GetMessage("Expression error");
			MyDiagnostic.PushException(result.parts[result.parts.length - 1].token, errorMsg);
			result.success = false;
		}

		if (result.success) {
			let left = new Token();
			let right = new Token();
			left.text = "(";
			right.text = ")";
			result.parts.unshift({ token: left, type: PriorityType.Level_4_Brackets, value: 0, highlightingType: HighlightType.None });
			result.parts.push({ token: right, type: PriorityType.Level_4_Brackets, value: 0, highlightingType: HighlightType.None });
		}

		return result;
	}
	//#endregion 表达式分解

	//#region 表达式排序，使用二叉树分析
	/**
	 * 表达式排序，使用二叉树分析
	 * @param exprParts 所有部分
	 */
	private static LexerSort(exprParts: ExpressionPart[]) {
		let result = { success: true, parts: <ExpressionPart[]>[] };
		let stack: ExpressionPart[] = [];
		let start = true;

		for (let i = 0; i < exprParts.length; i++) {
			const part = exprParts[i];
			switch (part.type) {
				case PriorityType.Level_0_Sure:
				case PriorityType.Level_1_Label:
				case PriorityType.Level_2_Number:
				case PriorityType.Level_3_String:
					let temp = ExpressionUtils.GetNumber(part.token.text);
					if (temp.success) {
						part.value = temp.value;
						part.type = PriorityType.Level_2_Number;
					}
					result.parts.push(part);
					break;
				case PriorityType.Level_4_Brackets:
					if (part.token.text === "(") {
						stack.push(part);
					} else {
						while (true) {
							let lex = stack.pop();
							if (!lex) {
								let erroMsg = Localization.GetMessage("Expression error");
								MyDiagnostic.PushException(part.token, erroMsg);
								result.success = false;
								break;
							} else if (lex.type === PriorityType.Level_4_Brackets) {
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
							let erroMsg = Localization.GetMessage("Expression error");
							MyDiagnostic.PushException(part.token, erroMsg);
							result.success = false;
							break;
						}

						if (part.type >= top.type && top.type != PriorityType.Level_4_Brackets) {
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

	//#region 获取字符串
	/**检查表达式小节是否包含字符串 */
	private static CheckString(parts: ExpressionPart[]) {
		let index = -1
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.type === PriorityType.Level_3_String) {
				index = i;
				break;
			}

		}
		return index;
	}
	//#endregion 获取字符串

}

