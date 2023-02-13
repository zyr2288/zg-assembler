import { Localization } from "../l10n/Localization";
import { LabelUtils } from "./Label";
import { MyException } from "./MyException";
import { Token } from "./Token";

//#region 算数优先级
enum PriorityType {
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
	type: PriorityType;
	token: Token;
	value: number;
}
//#endregion 表达式分割

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
	 * @returns 表达式小节
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
		let match = /^(?<hex>\$[0-9a-fA-F]+)|(?<decimal>\-?[0-9]+(\.[0-9]+)?)|(?<bin>\@[01]+)$/.exec(number);
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
			result.parts.push({ token: expression, type: PriorityType.Level_1_Label, value: 0 });
			return result;
		}

		let regex = /((?<!\\)")|\(|\)|\!=|==|\>\>|\>=|\<\<|\<=|\>|\<|\+|\-|\*|\/|%|&&|&|\|\||\||\^/g;

		let tokens = expression.Split(regex, { saveToken: true });
		let isLabel = true;

		let part: ExpressionPart = { type: PriorityType.Level_0_Sure, token: {} as Token, value: 0 };

		let stringStart = - 1;
		for (let i = 0; i < tokens.length; ++i) {
			part.token = tokens[i];
			switch (part.token.text) {
				case "\"":
					if (stringStart < 0) {
						stringStart = part.token.start;
					} else {
						part.token = expression.Substring(stringStart, part.token.start - stringStart);
						stringStart = -1;
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
				// MyException.PushException(now.token, ErrorType.ExpressionError, ErrorLevel.Show);
				break;
			}

			result.parts.push(part);
			part = { type: PriorityType.Level_0_Sure, token: {} as Token, value: 0 };
		}

		if (result.success) {
			let left = new Token();
			let right = new Token();
			left.text = "(";
			right.text = ")";
			result.parts.unshift({ token: left, type: PriorityType.Level_4_Brackets, value: 0 });
			result.parts.push({ token: right, type: PriorityType.Level_4_Brackets, value: 0 });
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
					if (part.token.text == "(") {
						stack.push(part);
					} else {
						while (true) {
							let lex = stack.pop();
							if (!lex) {
								let erroMsg = Localization.GetMessage("Expression error");
								// MyException.PushException(part.token, erroMsg);
								result.success = false;
								break;
							} else if (lex.type == PriorityType.Level_4_Brackets) {
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
							// MyException.PushException(part.token, ErrorType.ExpressionError, ErrorLevel.Show);
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

}