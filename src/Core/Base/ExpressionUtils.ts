import { Localization } from "../I18n/Localization";
import { HighlightToken, HighlightType } from "../Lines/CommonLine";
import { Compiler } from "./Compiler";
import { ILabel, LabelType, LabelUtils } from "./Label";
import { MyDiagnostic } from "./MyException";
import { DecodeOption } from "./Options";
import { Token } from "./Token";
import { Utils } from "./Utils";

/**运算符的正则表达式 */
const OperationRegex = /((?<!\\)")|\(|\)|\~|\!=|==|\!|\>\>|\>=|\<=|\<\<|\>|\<|=|\+|\-|\*|\/|%|&&|&|\|\||\||\^|\$(?![0-9a-fA-F])/g;

//#region 算数优先级
export enum PriorityType {
	Level_0_Sure = -1,
	/**标签、数字 */
	Level_1_Label,
	/**数字 */
	Level_2_Number,
	/**字符串 */
	Level_3_CharArray,
	/**虚拟括号，不存在的，用作表达式初始时候加入的括号，方便二叉树分析 */
	Level_3_Brackets,
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
	chars?: number[];
}
//#endregion 表达式分割

/**表达式分析选项，默认 Number，分析类型默认 无 */
export interface ExpAnalyseOption {
	/**分析类型，尝试获取结果 或 获取不了结果报错 */
	analyseType?: "Try" | "GetAndShowError";
	/**结果类型，number 或 number[] */
	resultType?: "Number" | "ArrayNumber";
}

export interface ExpResultType<T> {
	success: boolean;
	value: T;
}

export class ExpressionUtils {

	/**符号优先级 */
	private static onlyOnePriority: Map<string, PriorityType> = new Map();

	//#region 初始化
	/**初始化 */
	static Initialize() {
		ExpressionUtils.onlyOnePriority.set("(", PriorityType.Level_4_Brackets);
		ExpressionUtils.onlyOnePriority.set(")", PriorityType.Level_4_Brackets);
		ExpressionUtils.onlyOnePriority.set("*", PriorityType.Level_6);
		ExpressionUtils.onlyOnePriority.set("$", PriorityType.Level_6);
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
		const match = /(^(?<hex>\$[0-9a-fA-F]+)$)|(^(?<decimal>\-?[0-9]+(\.[0-9]+)?)$)|(^(?<bin>\@[01]+)$)/.exec(number);
		const result = { success: !!match, value: 0 };
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

			const label = LabelUtils.FindLabel(part.token, option?.macro);
			if (!label || label.labelType === LabelType.None) {
				const errorMsg = Localization.GetMessage("Label {0} not found", parts[i].token.text);
				MyDiagnostic.PushException(parts[i].token, errorMsg);
				error = true;
			} else {
				switch (label.labelType) {
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

	//#region 获取包含字符串的表达式值
	/**
	 * 获取包含字符串的表达式值
	 * @param parts 小节
	 * @param analyseOption 表达式结果选项
	 * @param option 选项
	 * @returns 结果
	 */
	static GetExpressionValue<T = number | number[]>(parts: ExpressionPart[], option: DecodeOption, analyseOption?: ExpAnalyseOption): ExpResultType<T> {
		const strIndex = ExpressionUtils.CheckString(parts);
		const result: ExpResultType<T> = { success: false, value: [] as T };

		analyseOption ??= {};
		analyseOption.resultType ??= "Number";
		analyseOption.analyseType ??= Compiler.isLastCompile ? "GetAndShowError" : "Try";

		if (strIndex < 0) {
			const temp = ExpressionUtils._GetExpressionValue(parts, analyseOption, option);
			result.success = temp.success;
			result.value = (analyseOption.resultType === "Number" ? temp.value : [temp.value]) as T;
			return result;
		}

		const strPart = parts[strIndex];
		if (analyseOption.resultType === "Number" && strPart.chars!.length > 1) {
			const error = Localization.GetMessage("Unsupport string");
			MyDiagnostic.PushException(strPart.token, error);
			result.success = false;
			return result;
		}


		(result.value as number[]) = [];
		(result.value as number[]).length = strPart.chars!.length;
		result.success = true;

		strPart.type = PriorityType.Level_0_Sure;
		for (let i = 0; i < strPart.chars!.length; i++) {
			if (!strPart.chars![i]) {
				strPart.type = PriorityType.Level_3_CharArray;
				result.success = false;
				break;
			}

			strPart.value = strPart.chars![i];
			const temp3 = ExpressionUtils._GetExpressionValue(parts, analyseOption, option);
			if (!temp3.success) {
				strPart.type = PriorityType.Level_3_CharArray;
				result.success = false;
				break;
			}

			(result.value as number[])[i] = temp3.value;
		}

		if (analyseOption.resultType === "Number")
			result.value = (result.value as number[])[0] as T;

		return result;
	}
	//#endregion 获取包含字符串的表达式值

	//#region 将所有表达式部分转换成高亮Token
	/**
	 * 将所有表达式部分转换成高亮Token
	 * @param parts 表达式小节
	 * @returns 高亮标识
	 */
	static GetHighlightingTokens(parts: ExpressionPart[][]) {
		let result: HighlightToken[] = [];
		for (let i = 0; i < parts.length; ++i) {
			for (let j = 0; j < parts[i].length; ++j) {
				const part = parts[i][j];
				switch (part.type) {
					case PriorityType.Level_1_Label:
						result.push({ token: part.token, type: part.highlightingType });
						break;
					case PriorityType.Level_2_Number:
						if (part.token.text === "$" || part.token.text === "*")
							result.push({ token: part.token, type: HighlightType.Number });

						break;
				}
			}
		}
		return result;
	}
	//#endregion 将所有表达式部分转换成高亮Token

	//#region 拼合ExpressionPart成Token
	/**
	 * 拼合ExpressionPart成Token
	 * @param parts 表达式
	 * @returns 
	 */
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

	//#region 获取表达式的值
	/**
	 * 获取表达式的值
	 * @param allParts 所有已排列好的运算小节
	 * @param analyseOption 分析选项
	 * @param option 编译选项
	 * @returns 计算结果
	 */
	private static _GetExpressionValue(allParts: ExpressionPart[], analyseOption: ExpAnalyseOption, option?: DecodeOption) {
		const tempPart = Utils.DeepClone(allParts);
		const GetPart = (index: number) => {
			if (index < 0 || index >= tempPart.length)
				return;

			return tempPart[index];
		}

		let labelUnknow = false;
		const result = { success: true, value: 0 };
		for (let index = 0; index < tempPart.length; index++) {
			const element = tempPart[index];
			if (element.type === PriorityType.Level_0_Sure)
				continue;

			if (element.type === PriorityType.Level_3_CharArray) {
				const error = Localization.GetMessage("Expression error");
				MyDiagnostic.PushException(element.token, error);
				continue;
			}

			// 用于判断标签等
			if (element.type < PriorityType.Level_4_Brackets && element.type >= 0) {
				if (labelUnknow)
					continue;

				if (element.token.text === "*" && Compiler.enviroment.orgAddress >= 0) {
					element.value = Compiler.enviroment.orgAddress;
					element.type = PriorityType.Level_0_Sure;
					continue;
				}

				if (element.token.text === "$" && Compiler.enviroment.baseAddress >= 0) {
					element.value = Compiler.enviroment.baseAddress;
					element.type = PriorityType.Level_0_Sure;
					continue;
				}

				const temp = ExpressionUtils.GetNumber(element.token.text);
				if (temp.success) {		// 如果是数字
					element.value = temp.value;
					element.type = PriorityType.Level_0_Sure;
				} else {				// 如果是标签
					const label = LabelUtils.FindLabel(element.token, option?.macro);
					if (label?.value === undefined) {
						if (analyseOption.analyseType === "GetAndShowError") {
							const errorMsg = Localization.GetMessage("Label {0} not found", element.token.text);
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

			const pre1 = GetPart(index - 2);
			const pre2 = GetPart(index - 1);
			const operation = element;
			if (element.type === PriorityType.Level_5) {
				if (!pre2) {
					result.success = false;
					let errorMsg = Localization.GetMessage("Label {0} not found", element.token.text);
					MyDiagnostic.PushException(element.token, errorMsg);
					break;
				}

				const value2 = pre2.value;

				switch (operation.token.text) {
					case "!":
						operation.value = value2 !== 0 ? 1 : 0;
						break;
					case "-":
						operation.value = -value2;
						break;
					case ">":
						operation.value = (value2 & 0xFF00) >> 8;
						break;
					case "<":
						operation.value = value2 & 0xFF;
						break;
					case "~":
						operation.value = ~value2;
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

				const value1 = pre1.value;
				const value2 = pre2.value;

				switch (operation.token.text) {
					case "*":
						operation.value = value1 * value2;
						break;
					case "/":
						operation.value = value1 / value2;
						break;
					case "%":
						operation.value = value1 % value2;
						break;
					case "+":
						operation.value = value1 + value2;
						break;
					case "-":
						operation.value = value1 - value2;
						break;
					case "<<":
						operation.value = value1 << value2;
						break;
					case ">>":
						operation.value = value1 >>> value2;
						break;
					case "==":
						operation.value = value1 === value2 ? 1 : 0;
						break;
					case "!=":
						operation.value = value1 !== value2 ? 1 : 0;
						break;
					case "&":
						operation.value = value1 & value2;
						break;
					case "^":
						operation.value = value1 ^ value2;
						break;
					case "|":
						operation.value = value1 | value2;
						break;
					case "&&":
						operation.value = value1 && value2;
						break;
					case "||":
						operation.value = value1 || value2;
						break;
					case ">":
						operation.value = value1 > value2 ? 1 : 0;
						break;
					case ">=":
						operation.value = value1 >= value2 ? 1 : 0;
						break;
					case "<":
						operation.value = value1 < value2 ? 1 : 0;
						break;
					case "<=":
						operation.value = value1 <= value2 ? 1 : 0;
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
			result.value = tempPart[0].value as number;

		return result;
	}
	//#endregion 获取表达式的值

	//#region 表达式分解
	/**
	 * 表达式分解，是否没有错误，false为有错误
	 * @param expression 表达式
	 * @returns 是否有误，以及表达式各个部分
	 */
	private static ExpressionSplit(expression: Token) {
		const result = { success: true, parts: [] as ExpressionPart[] };

		// 临时标签
		if (LabelUtils.namelessLabelRegex.test(expression.text)) {
			result.parts.push({ token: expression, type: PriorityType.Level_1_Label, value: 0, highlightingType: HighlightType.Label });
			return result;
		}

		const tokens = expression.Split(OperationRegex, { saveToken: true });
		let isLabel = true;

		let part!: ExpressionPart;
		const CreateNewPart = () => part = { type: PriorityType.Level_1_Label, token: {} as Token, value: 0, highlightingType: HighlightType.None };

		CreateNewPart();

		let stringStart = -1;

		for (let i = 0; i < tokens.length; ++i) {
			part.token = tokens[i];
			if (part.token.isEmpty)
				continue;

			if (stringStart > 0 && part.token.text !== "\"")
				continue;

			switch (part.token.text) {
				case "\"":
					if (stringStart < 0) {
						stringStart = part.token.start;
						continue;
					} else {
						part.token = expression.Substring(stringStart - expression.start + 1, part.token.start - stringStart - 1);
						const length = part.token.text.length;
						switch (length) {
							case 0:
								const error = Localization.GetMessage("Expression error");
								MyDiagnostic.PushException(part.token, error);
								break;
							case 1:
								part.type = PriorityType.Level_0_Sure;
								part.value = part.token.text.charCodeAt(0);
								break;
							default:
								part.type = PriorityType.Level_3_CharArray;
								part.chars = [];
								for (let j = 0; j < part.token.text.length; j++)
									part.chars[j] = part.token.text.charCodeAt(j);

								break;
						}
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
				case "~":
					if (!isLabel) {
						result.success = false;
						break;
					}

					part.type = PriorityType.Level_5;
					isLabel = true;
					break;
				case "*":
				case "$":
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
				case "<=":
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
					const errorMsg = Localization.GetMessage("Expression error");
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
				const errorMsg = Localization.GetMessage("Expression error");
				MyDiagnostic.PushException(part.token, errorMsg);
				break;
			}

			result.parts.push(part);
			CreateNewPart();
		}

		if (result.success && isLabel) {
			const errorMsg = Localization.GetMessage("Expression error");
			MyDiagnostic.PushException(result.parts[result.parts.length - 1].token, errorMsg);
			result.success = false;
		}

		if (result.success) {
			const left = Token.EmptyToken();
			const right = Token.EmptyToken();
			left.text = "(";
			right.text = ")";
			result.parts.unshift({ type: PriorityType.Level_3_Brackets, token: left, value: 0, highlightingType: HighlightType.None });
			result.parts.push({ type: PriorityType.Level_3_Brackets, token: right, value: 0, highlightingType: HighlightType.None });
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
		const result = { success: true, parts: [] as ExpressionPart[] };
		const stack: ExpressionPart[] = [];

		let matchBarket!: ExpressionPart;
		for (let i = 0; i < exprParts.length; i++) {
			const part = exprParts[i];
			switch (part.type) {
				case PriorityType.Level_0_Sure:
				case PriorityType.Level_3_CharArray:
					result.parts.push(part);
					break;
				case PriorityType.Level_1_Label:
				case PriorityType.Level_2_Number:
					const temp = ExpressionUtils.GetNumber(part.token.text);
					if (temp.success) {
						part.value = temp.value;
						part.type = PriorityType.Level_2_Number;
					}
					result.parts.push(part);
					break;
				case PriorityType.Level_3_Brackets:
				case PriorityType.Level_4_Brackets:
					if (part.token.text === "(") {
						stack.push(part);
					} else {
						while (true) {
							const lex = stack.pop();
							if (!lex) {
								const erroMsg = Localization.GetMessage("Expression error");
								if (part.type === PriorityType.Level_3_Brackets) {
									MyDiagnostic.PushException(matchBarket.token, erroMsg);
								} else {
									MyDiagnostic.PushException(part.token, erroMsg);
								}
								result.success = false;
								break;
							} else if (lex.type === PriorityType.Level_4_Brackets) {
								matchBarket = lex;
								break;
							} else if (lex.type === PriorityType.Level_3_Brackets) {
								if (part.type !== PriorityType.Level_3_Brackets) {
									matchBarket = part;
								}
								break;
							}
							result.parts.push(lex);
						}
					}
					break;
				default:
					while (true) {
						const top = stack.pop();
						if (!top) {
							const erroMsg = Localization.GetMessage("Expression error");
							MyDiagnostic.PushException(part.token, erroMsg);
							result.success = false;
							break;
						}

						if (part.type >= top.type && top.type !== PriorityType.Level_4_Brackets && top.type !== PriorityType.Level_3_Brackets) {
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

		if (stack.length !== 0) {
			const erroMsg = Localization.GetMessage("Expression error");
			MyDiagnostic.PushException(matchBarket.token, erroMsg);
			result.success = false;
		}

		return result;
	}
	//#endregion 表达式优先级排序

	//#region 检查表达式小节是否包含长度大于1的字符串
	/**
	 * 检查表达式小节是否包含长度大于1的字符串
	 * @param parts 所有表达式小节
	 * @returns 
	 */
	private static CheckString(parts: ExpressionPart[]) {

		let index = -1;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.type === PriorityType.Level_3_CharArray) {
				index = i;
				break;
			}

		}
		return index;
	}
	//#endregion 检查表达式小节是否包含长度大于1的字符串

}

