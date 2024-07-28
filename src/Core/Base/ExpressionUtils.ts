import { Localization } from "../I18n/Localization";
import { CompileOption } from "./CompileOption";
import { Compiler } from "../Compiler/Compiler";
import { HighlightType } from "../LanguageHelper/HighlightingProvider";
import { LabelType, LabelUtils } from "./Label";
import { MyDiagnostic } from "./MyDiagnostic";
import { Token } from "./Token";
import { Utils } from "./Utils";
import { Macro } from "./Macro";

/**运算符的正则表达式 */
const OperationRegex = /((?<!\\)")|\(|\)|\[|\]|\~|\!=|==|\!|\>\>|\>=|\<=|\<\<|\>|\<|=|\+|\-|\*|\/|%|&&|&|\|\||\||\^|\$(?![0-9a-fA-F])/g;

//#region 算数优先级
export enum PriorityType {
	Level_0_Sure = -1,
	/**标签、数字 */
	Level_1_Label,
	/**数字 */
	Level_2_Number,
	/**字符串 */
	Level_3_CharArray,
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
	/**中括号 */
	Level_16_Brackets,
};
//#endregion 算数优先级

//#region 表达式分割
export interface ExpressionPart {
	/**高亮类型 */
	highlightType: HighlightType;
	/**运算符类型 */
	type: PriorityType;
	/**小节 */
	token: Token;
	/**结果值 */
	value: number;
	/**如果是字符串，则会有每个char值 */
	chars?: number[];
}
//#endregion 表达式分割

//#region 一个表达式结果
/**一个表达式结果 */
export interface Expression {
	/**表达式小节 */
	parts: ExpressionPart[];
	/**字符串Index，-1则是没有字符串 */
	stringIndex: number;
	/**字符串长度，默认0 */
	stringLength: number;
}
//#endregion 一个表达式结果

/**表达式工具 */
export class ExpressionUtils {

	/**符号优先级 */
	private static onlyOnePriority: Map<string, PriorityType> = new Map();

	//#region 初始化
	/**初始化 */
	static Initialize() {
		ExpressionUtils.AddPriority(PriorityType.Level_4_Brackets, "(", ")");
		ExpressionUtils.AddPriority(PriorityType.Level_6, "*", "/", "%");
		ExpressionUtils.AddPriority(PriorityType.Level_7, "+", "-");
		ExpressionUtils.AddPriority(PriorityType.Level_8_Shift, "<<", ">>");
		ExpressionUtils.AddPriority(PriorityType.Level_9_Confident1, ">", "<", ">=", "<=");
		ExpressionUtils.AddPriority(PriorityType.Level_10_Confident2, "!=", "==");
		ExpressionUtils.AddPriority(PriorityType.Level_11_And, "&");
		ExpressionUtils.AddPriority(PriorityType.Level_12_Eor, "^");
		ExpressionUtils.AddPriority(PriorityType.Level_13_Or, "|");
		ExpressionUtils.AddPriority(PriorityType.Level_14_AndAnd, "&&");
		ExpressionUtils.AddPriority(PriorityType.Level_15_OrOr, "||");
		ExpressionUtils.AddPriority(PriorityType.Level_16_Brackets, "[", "]");
	}

	private static AddPriority(type: PriorityType, ...op: string[]) {
		for (let i = 0; i < op.length; i++)
			ExpressionUtils.onlyOnePriority.set(op[i], type);

	}
	//#endregion 初始化

	//#region 分割并排序表达式
	/**
	 * 分割并排序表达式
	 * @param expression 表达式
	 * @param info 文件信息
	 * @returns 
	 */
	static SplitAndSort(expression: Token): Expression | undefined {
		let temp = ExpressionUtils.SplitExpression(expression);
		if (!temp.success)
			return;

		let temp2 = ExpressionUtils.LexerSort(temp.parts);
		if (!temp.success)
			return;

		return { parts: temp2.parts, stringIndex: temp2.stringIndex, stringLength: temp.stringLength };
	}
	//#endregion 分割并排序表达式

	//#region 搜索所有标签
	/**
	 * 检查所以标签
	 * @param option 编译选项
	 * @param expParts 表达式
	 * @returns true为有误
	 */
	static CheckLabels(option: CompileOption, ...expParts: Expression[]) {
		let error = false;
		for (let i = 0; i < expParts.length; i++) {
			const parts = expParts[i].parts;
			for (let j = 0; j < parts.length; j++) {
				const part = parts[j];
				switch (part.type) {
					case PriorityType.Level_1_Label:
						const label = LabelUtils.FindLabel(part.token, option);
						if (!label) {
							const errMsg = Localization.GetMessage("Label {0} not found", part.token.text);
							MyDiagnostic.PushException(part.token, errMsg);
							error = true;
						} else {
							switch (label.type) {
								case LabelType.Label:
									part.highlightType = HighlightType.Label;
									break;
								case LabelType.Defined:
									part.highlightType = HighlightType.Defined;
									break;
							}
						}
						break;
				}

			}
		}
		return error;
	}
	//#endregion 搜索所有标签

	//#region 获取结果值
	/**
	 * 获取结果值
	 * @param parts 
	 * @param other.tryValue 默认不写按照最后一次编译是false，其它是true
	 * @returns 
	 */
	static GetValue(parts: ExpressionPart[], option?: { macro?: Macro, tryValue?: boolean }) {
		const tempPart = Utils.DeepClone(parts);
		const GetPart = (index: number) => {
			if (index < 0 || index >= tempPart.length)
				return;

			return tempPart[index];
		}

		let tryValue = Compiler.NotLastCompile();
		if (option?.tryValue !== undefined)
			tryValue = option.tryValue;

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

				if (element.token.text === "*" && Compiler.enviroment.address.org >= 0) {
					element.value = Compiler.enviroment.address.org;
					element.type = PriorityType.Level_0_Sure;
					continue;
				}

				if (element.token.text === "$" && Compiler.enviroment.address.base >= 0) {
					element.value = Compiler.enviroment.address.base;
					element.type = PriorityType.Level_0_Sure;
					continue;
				}

				const temp = ExpressionUtils.GetNumber(element.token.text);
				if (temp.success) {		// 如果是数字
					element.value = temp.value;
					element.type = PriorityType.Level_0_Sure;
				} else {				// 如果是标签
					const label = LabelUtils.FindLabel(element.token, { macro: option?.macro });
					if (label?.value === undefined) {
						if (!tryValue) {
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
	//#endregion 获取结果值

	//#region 获取包含字符串的结果值
	/**
	 * 获取包含字符串的结果值
	 * @param expression 表达式
	 * @param option 编译选项
	 * @param analyseOption 分析选项
	 * @returns 
	 */
	static GetStringValue(expression: Expression, option?: { macro?: Macro, tryValue?: boolean }) {
		const result = { success: true, values: [] as number[] };
		result.values.length = expression.stringLength;

		if (option?.macro)
			ExpressionUtils.CheckExpressionMacro(expression, option.macro)

		const index = expression.stringIndex;
		if (index < 0) {
			result.values.length = 1;
			const temp = ExpressionUtils.GetValue(expression.parts, option);
			result.success = temp.success;
			if (temp.success)
				result.values[0] = temp.value;
		} else {
			for (let i = 0; i < expression.stringLength; i++) {
				const part = Utils.DeepClone(expression.parts);
				part[index] = {
					token: expression.parts[index].token.Copy(),
					value: expression.parts[index].chars![i],
					type: PriorityType.Level_0_Sure,
					highlightType: HighlightType.Number
				}

				const temp = ExpressionUtils.GetValue(part, option);
				if (!temp.success) {
					result.success = temp.success;
					break;
				}

				result.values[i] = temp.value;
			}
		}
		return result;
	}
	//#endregion 获取包含字符串的结果值

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

	/***** private *****/

	//#region 分割表达式
	/**
	 * 分割表达式
	 * @param expression 整合的表达式Token
	 * @returns 
	 */
	private static SplitExpression(expression: Token) {

		const result = { success: true, parts: [] as ExpressionPart[], stringIndex: -1, stringLength: 0 };

		// 临时标签
		if (LabelUtils.namelessLabelRegex.test(expression.text)) {
			result.parts.push({ token: expression, type: PriorityType.Level_1_Label, value: 0, highlightType: HighlightType.Label });
			return result;
		}

		const tokens = expression.Split(OperationRegex, { saveToken: true });
		let isLabel = true;

		let part!: ExpressionPart;
		const CreateNewPart = () => part = { type: PriorityType.Level_1_Label, token: {} as Token, value: 0, highlightType: HighlightType.None };

		CreateNewPart();

		let stringStart = -1;
		forLoop:
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
								result.success = false;
								break forLoop;
							case 1:
								part.type = PriorityType.Level_0_Sure;
								part.value = part.token.text.charCodeAt(0);
								if (result.stringLength === 0)
									result.stringLength = 1;

								break;
							default:
								part.type = PriorityType.Level_3_CharArray;
								part.chars = [];
								for (let i = 0; i < part.token.text.length; i++)
									part.chars[i] = part.token.text.charCodeAt(i);

								if (result.stringLength < part.token.text.length)
									result.stringLength = part.token.text.length;

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
					}

					isLabel = true;
					part.type = ExpressionUtils.onlyOnePriority.get(part.token.text)!;
					break;
				case ")":
				case "]":
					if (isLabel) {
						result.success = false;
						break;
					};

					isLabel = false;
					part.type = ExpressionUtils.onlyOnePriority.get(part.token.text)!;
					break;
				case "[":
					if (isLabel) {
						result.success = false;
						break;
					}

					isLabel = true;
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

			if (part.type !== PriorityType.Level_3_CharArray)
				part.token = part.token.Trim();

			result.parts.push(part);
			CreateNewPart();
		}

		if (result.success && isLabel) {
			const errorMsg = Localization.GetMessage("Expression error");
			MyDiagnostic.PushException(result.parts[result.parts.length - 1].token, errorMsg);
			result.success = false;
		}

		return result;
	}
	//#endregion 分割表达式

	//#region 表达式排序，使用二叉树分析
	/**
	 * 表达式排序，使用二叉树分析
	 * @param exprParts 所有部分
	 */
	private static LexerSort(exprParts: ExpressionPart[]) {

		const result = { success: true, parts: [] as ExpressionPart[], stringIndex: -1 };
		const stack: ExpressionPart[] = [];

		for (let i = 0; i < exprParts.length; i++) {
			const part = exprParts[i];
			switch (part.type) {
				case PriorityType.Level_0_Sure:
					result.parts.push(part);
					break;
				case PriorityType.Level_3_CharArray:
					if (result.stringIndex >= 0) {
						const error = Localization.GetMessage("Expression error");
						MyDiagnostic.PushException(part.token, error);
						result.success = false;
						return result;
					}

					result.stringIndex = result.parts.length;
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
				case PriorityType.Level_4_Brackets:
					if (part.token.text === "(") {
						stack.push(part);
					} else {
						while (stack.length > 0 && stack[stack.length - 1].token.text !== "(") {
							const lex = stack.pop()!;
							result.parts.push(lex);
						}

						if (stack.length === 0 || stack[stack.length - 1].token.text !== "(") {
							const erroMsg = Localization.GetMessage("Expression error");
							MyDiagnostic.PushException(part.token, erroMsg);
							result.success = false;
							break;
						}

						stack.pop();
					}
					break;
				case PriorityType.Level_16_Brackets:
					if (part.token.text === "[") {
						stack.push(part);
					} else {
						while (stack.length > 0 && stack[stack.length - 1].token.text !== "[") {
							const lex = stack.pop()!;
							result.parts.push(lex);
						}

						if (stack.length === 0 || stack[stack.length - 1].token.text !== "[") {
							const erroMsg = Localization.GetMessage("Expression error");
							MyDiagnostic.PushException(part.token, erroMsg);
							result.success = false;
							break;
						}

						result.parts.push(stack.pop()!);
					}
					break;
				default:
					while (stack.length > 0 && part.type >= stack[stack.length - 1].type) {
						const top = stack.pop();
						if (!top)
							break;

						if (part.type >= top.type && top.type !== PriorityType.Level_4_Brackets) {
							result.parts.push(top);
							continue;
						}

						stack.push(top);
						break;
					}

					stack.push(part);
					break;
			}

			if (!result.success)
				break;
		}

		while (true) {
			let p = stack.pop();
			if (!p)
				break;

			if (p.type === PriorityType.Level_4_Brackets || p.type === PriorityType.Level_16_Brackets) {
				const erroMsg = Localization.GetMessage("Expression error");
				MyDiagnostic.PushException(p.token, erroMsg);
				result.success = false;
				break;
			}
			result.parts.push(p);
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

	//#region 检查在 Macro 里的参数
	private static CheckExpressionMacro(expression: Expression, macro: Macro) {
		for (let i = 0; i < expression.parts.length; i++) {
			const part = expression.parts[i];
			if (part.type !== PriorityType.Level_1_Label)
				continue;

			const param = macro.params.get(part.token.text);
			if (!param)
				continue;

			if (param.values.length > 1) {
				part.chars = param.values;
				expression.stringIndex = i;
				expression.stringLength = param.values.length;
			} else {
				part.value = param.values[0];
				part.type = PriorityType.Level_0_Sure;
			}

		}
	}
	//#endregion 检查在 Macro 里的参数

}