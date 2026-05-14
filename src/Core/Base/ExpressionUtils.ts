import { Localization } from "../I18n/Localization";
import { CompileOption } from "./CompileOption";
import { Compiler } from "../Compiler/Compiler";
import { HighlightType } from "../LanguageHelper/HighlightingProvider";
import { LabelType, LabelUtils } from "./Label";
import { MyDiagnostic } from "./MyDiagnostic";
import { Token } from "./Token";
import { Utils } from "./Utils";
import { Macro } from "./Macro";
import { Config } from "./Config";

/**运算符的正则表达式 */
const OperationRegex = /((?<!\\)")|\(|\)|\[|\]|\~|\!=|==|\!|\>\>|\>=|\<=|\<\<|\>|\<|=|\+|\-|\*|\/|%|&&|&|\|\||\||\^|\$(?![0-9a-fA-F])/g;

//#region 算数优先级
export enum PriorityType {
	Level_0_Sure = -1,
	/**标签、数字 */
	Level_1_Label,
	/**地址，ORG BASE */
	Level_2_Address,
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
	chars?: string[];
}
//#endregion 表达式分割

//#region 一个表达式结果
/**一个表达式结果 */
export interface Expression {
	/**表达式小节 */
	parts: ExpressionPart[];
	/**字符串Index，-1则是没有字符串 */
	stringIndex: number;
}
//#endregion 一个表达式结果

export interface ResultData<T> {
	success: boolean;
	data: T;
}

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
	 * @param option.macro 宏
	 * @returns 
	 */
	static SplitAndSort(expression: Token): Expression | undefined {
		let temp;
		temp = ExpressionUtils.SplitExpression(expression);
		if (!temp.success)
			return;

		temp = ExpressionUtils.LexerSort(temp.data.parts);
		if (!temp.success)
			return;

		return { parts: temp.data.parts, stringIndex: temp.data.stringIndex };
	}
	//#endregion 分割并排序表达式

	//#region 搜索所有标签
	/**
	 * 搜索所有标签
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
		const result = { success: true, value: 0 };
		if (option?.macro)
			ExpressionUtils.ReplaceExpression(parts, option.macro);

		const exps = ExpressionUtils.CheckLabelAndGetValue(parts, option);
		if (!exps) {
			result.success = false;
			return result;
		}

		const GetPart = (index: number) => {
			if (index < 0 || index >= exps.length)
				return;

			return exps[index];
		}

		let errorIndex = -1;
		for (let index = 0; index < exps.length; index++) {
			errorIndex++;
			let element = exps[index];
			if (typeof element === "number")
				continue;

			switch (element) {
				case "(!)":
				case "(-)":
				case "(>)":
				case "(<)":
				case "(~)":
					const pre = GetPart(index - 1) as number;
					if (pre === undefined) {
						result.success = false;
						const errorMsg = Localization.GetMessage("Expression error");
						MyDiagnostic.PushException(parts[errorIndex].token, errorMsg);
						break;
					}

					switch (element) {
						case "(!)": element = pre !== 0 ? 1 : 0; break;
						case "(-)": element = -pre; break;
						case "(>)": element = (pre & 0xFF00) >> 8; break;
						case "(<)": element = pre & 0xFF; break;
						case "(~)": element = ~pre; break;
					}

					exps[index] = element;
					exps.splice(index - 1, 1);
					index -= 1;
					break;
				default:
					const value1 = GetPart(index - 2) as number;
					const value2 = GetPart(index - 1) as number;
					if (value1 === undefined || value2 === undefined) {
						result.success = false;
						const errorMsg = Localization.GetMessage("Expression error");
						MyDiagnostic.PushException(parts[errorIndex].token, errorMsg);
						break;
					}

					switch (element) {
						case "*": element = value1 * value2; break;
						case "/": element = value1 / value2; break;
						case "%": element = value1 % value2; break;
						case "+": element = value1 + value2; break;
						case "-": element = value1 - value2; break;
						case "<<": element = value1 << value2; break;
						case ">>": element = value1 >>> value2; break;
						case "==": element = value1 === value2 ? 1 : 0; break;
						case "!=": element = value1 !== value2 ? 1 : 0; break;
						case "&": element = value1 & value2; break;
						case "^": element = value1 ^ value2; break;
						case "|": element = value1 | value2; break;
						case "&&": element = value1 && value2; break;
						case "||": element = value1 || value2; break;
						case ">": element = value1 > value2 ? 1 : 0; break;
						case ">=": element = value1 >= value2 ? 1 : 0; break;
						case "<": element = value1 < value2 ? 1 : 0; break;
						case "<=": element = value1 <= value2 ? 1 : 0; break;
					}

					exps[index] = element;
					exps.splice(index - 2, 2);
					index -= 2;
					break;
			}
		}

		if (result.success)
			result.value = exps[0] as number;

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

		if (expression.stringIndex < 0)
			result.values.length = 1;
		else
			result.values.length = expression.parts[expression.stringIndex].chars!.length;

		if (option?.macro)
			ExpressionUtils.ReplaceExpression(expression.parts, option.macro);

		const index = expression.stringIndex;
		if (index < 0) {
			result.values.length = 1;
			const temp = ExpressionUtils.GetValue(expression.parts, option);
			result.success = temp.success;
			if (temp.success)
				result.values[0] = temp.value;
		} else {
			for (let i = 0; i < result.values.length; i++) {
				const part = Utils.DeepClone(expression.parts);
				part[index] = {
					token: expression.parts[index].token.Copy(),
					value: 0,
					type: PriorityType.Level_0_Sure,
					highlightType: HighlightType.Number,
				};
				delete (part[index].chars);

				part[index].value = ExpressionUtils.GetCharCode(expression.parts[index].chars![i]);
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

	//#region 拆分分析字符串
	/**
	 * 拆分分析字符串
	 * @param token 已经去掉两端双引号的字符串Token
	 * @returns 
	 */
	static SplitStringToChars(token: Token) {
		const GetChar = (index: number, length?: number) => {
			length = length || 1;
			if (index + length - 1 >= token.length)
				return;

			return token.text.substring(index, index + length);
		}

		const result: string[] = [];

		/**是否是转义字符 */
		let inMark = false;

		/**是否在大括号之内 */
		let inRange = -1;

		const AddToResult = (chr: string) => {
			if (inRange >= 0) {
				result[result.length - 1] += chr;
				return;
			}

			result.push(chr);
		}


		for (let i = 0; i < token.length; i++) {
			const chr = token.text[i];
			switch (chr) {
				case "\"":
					if (inMark) {
						AddToResult(chr);
						inMark = false;
					} else {
						const error = Localization.GetMessage("String format error");
						MyDiagnostic.PushException(token, error);
						return;
					}
					break;
				case "\\":			// 转义字符
					if (inMark) {
						AddToResult(chr);
						inMark = false;
						break;
					}
					inMark = true;
					break;

				case "x":
					if (inMark) {
						const chr = GetChar(i + 1, 2);
						if (!chr) {
							const error = Localization.GetMessage("String format error");
							MyDiagnostic.PushException(token, error);
							return;
						}

						const code = parseInt(chr, 16);
						AddToResult(String.fromCharCode(code));
						i += 2;
						inMark = false;
						break;
					}
					AddToResult(chr);
					break;

				case "u":
					if (inMark) {
						const chr = GetChar(i + 1, 1);
						if (chr !== "{") {
							const error = Localization.GetMessage("String format error");
							MyDiagnostic.PushException(token, error);
							return;
						}

						const endIndex = token.text.indexOf("}", i + 2);
						if (endIndex === -1) {
							const error = Localization.GetMessage("String format error");
							MyDiagnostic.PushException(token, error);
							return;
						}

						const code = parseInt(token.text.substring(i + 2, endIndex), 16);
						if (isNaN(code)) {
							const error = Localization.GetMessage("String format error");
							MyDiagnostic.PushException(token, error);
							return;
						}

						AddToResult(String.fromCharCode(code));
						i = endIndex;
						inMark = false;
						break;
					}
					AddToResult(chr);
					break;

				case "{":			// 开始范围
					if (inMark) {
						result.push(chr);
						inMark = false;
						break;
					}

					if (inRange >= 0) {
						const error = Localization.GetMessage("String format error");
						MyDiagnostic.PushException(token, error);
						return;
					}

					AddToResult(chr);
					inRange = i;
					break;

				case "}":			// 结束范围
					if (inMark) {
						result.push(chr);
						inMark = false;
						break;
					}

					if (inRange < 0) {
						const error = Localization.GetMessage("String format error");
						MyDiagnostic.PushException(token, error);
						return;
					}

					AddToResult(chr);
					inRange = -1;
					break;
				default:
					AddToResult(chr);
					break;
			}
		}

		if (inRange >= 0) {
			const error = Localization.GetMessage("String format error");
			MyDiagnostic.PushException(token, error);
			return;
		}

		return result;
	}
	//#endregion 拆分分析字符串

	/***** private *****/

	//#region 分割表达式
	/**
	 * 分割表达式，仅仅是对表达式进行分割，不对其进行运算
	 * @param expression 整合的表达式Token
	 * @returns 
	 */
	private static SplitExpression(expression: Token) {

		const result: ResultData<{ parts: ExpressionPart[], stringMaxLength: number }> = {
			success: true,
			data: { parts: [], stringMaxLength: 0 }
		};

		// 临时标签
		if (LabelUtils.namelessLabelRegex.test(expression.text)) {
			result.data.parts.push({ token: expression, type: PriorityType.Level_1_Label, value: 0, highlightType: HighlightType.Label });
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
						if (part.token.length === 0) {
							const error = Localization.GetMessage("Expression error");
							MyDiagnostic.PushException(part.token, error);
							result.success = false;
							break forLoop;
						}
						const temp = ExpressionUtils.ProcessString(part.token);
						if (temp) {
							part.token.text = temp.text;
						} else {
							result.success = false;
							return result;
						}

						const chars = ExpressionUtils.SplitStringToChars(temp)!;
						if (!chars) {
							result.success = false;
							return result;
						}

						// 判断字符串长度，0则是错误，1则是单独字符，可以当作数字，大于1则是字符串
						switch (chars.length) {
							case 0:
								const error = Localization.GetMessage("Expression error");
								MyDiagnostic.PushException(part.token, error);
								result.success = false;
								break forLoop;
							default:
								part.type = PriorityType.Level_3_CharArray;
								part.chars = chars;
								if (result.data.stringMaxLength < chars.length)
									result.data.stringMaxLength = chars.length;

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

					part.type = PriorityType.Level_2_Address;
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

			result.data.parts.push(part);
			CreateNewPart();
		}

		if (result.success && isLabel) {
			const errorMsg = Localization.GetMessage("Expression error");
			MyDiagnostic.PushException(result.data.parts[result.data.parts.length - 1].token, errorMsg);
			result.success = false;
		}

		return result;
	}

	private static GetCharCode(text: string) {
		const temp = Compiler.enviroment.charMap.get(text);
		if (temp)
			return temp.value;

		return text.charCodeAt(0);
	}
	//#endregion 分割表达式

	//#region 处理字符串
	/**
	 * 处理字符串
	 * @param token 字符串Token
	 * @returns 
	 */
	private static ProcessString(token: Token) {
		const result = token.Copy();
		result.text = "";

		let isConvert = false;

		const GetChar = (str: string, index: number, length: number) => {
			let result = "";
			while (true) {
				if (index >= str.length || length <= 0)
					break;

				result += str[index];

				index++;
				length--;
			}

			if (length !== 0) {
				const error = Localization.GetMessage("Expression error");
				MyDiagnostic.PushException(token, error);
				throw null;
			}

			return result;
		}

		try {
			for (let i = 0; i < token.length; i++) {
				const char = GetChar(token.text, i, 1);
				switch (char) {
					case "\\":
						isConvert = true;
						continue;
					default:
						if (isConvert) {
							switch (char) {
								case "\"":
									result.text += "\"";
									break;
								case "x":
								case "u":
									result.text += `\\${char}`;
									break;
							}
							isConvert = false;
							continue;
						}
						result.text += char;
						break;
				}
			}
			return result;
		} catch {
			return;
		}
	}
	//#endregion 处理字符串

	//#region 表达式排序，使用二叉树分析
	/**
	 * 表达式排序，使用二叉树分析
	 * @param exprParts 所有部分
	 */
	private static LexerSort(exprParts: ExpressionPart[]) {

		const result: ResultData<{ parts: ExpressionPart[], stringIndex: number }> = {
			success: true,
			data: { parts: [], stringIndex: -1 }
		};
		const stack: ExpressionPart[] = [];

		for (let i = 0; i < exprParts.length; i++) {
			const part = exprParts[i];
			switch (part.type) {
				case PriorityType.Level_0_Sure:
					result.data.parts.push(part);
					break;
				case PriorityType.Level_3_CharArray:
					if (result.data.stringIndex >= 0 && part.chars?.length !== 1) {
						const error = Localization.GetMessage("Expression error");
						MyDiagnostic.PushException(part.token, error);
						result.success = false;
						return result;
					}

					if (part.chars!.length > 1) {
						result.data.stringIndex = result.data.parts.length;
					}

					result.data.parts.push(part);
					break;
				case PriorityType.Level_1_Label:
				case PriorityType.Level_2_Address:
					const temp = ExpressionUtils.GetNumber(part.token.text);
					if (temp.success) {
						part.value = temp.value;
						part.type = PriorityType.Level_0_Sure;
					}
					result.data.parts.push(part);
					break;
				case PriorityType.Level_4_Brackets:
					if (part.token.text === "(") {
						stack.push(part);
					} else {
						while (stack.length > 0 && stack[stack.length - 1].token.text !== "(") {
							const lex = stack.pop()!;
							result.data.parts.push(lex);
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
							result.data.parts.push(lex);
						}

						if (stack.length === 0 || stack[stack.length - 1].token.text !== "[") {
							const erroMsg = Localization.GetMessage("Expression error");
							MyDiagnostic.PushException(part.token, erroMsg);
							result.success = false;
							break;
						}

						result.data.parts.push(stack.pop()!);
					}
					break;
				default:
					while (stack.length > 0 && part.type >= stack[stack.length - 1].type) {
						const top = stack.pop();
						if (!top)
							break;

						if (part.type >= top.type &&
							top.type !== PriorityType.Level_4_Brackets &&
							top.type !== PriorityType.Level_5) {
							result.data.parts.push(top);
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
			result.data.parts.push(p);
		}

		return result;
	}
	//#endregion 表达式优先级排序

	//#region 检查所有小节并获取值，简化计算量
	/**
	 * 检查所有小节并获取值，简化计算量
	 * @param parts 所有表达式小节
	 * @param option.tryValue 是否是尝试获取值
	 * @param option.macro 自定义函数
	 * @returns true为正确，false为有误
	 */
	private static CheckLabelAndGetValue(parts: ExpressionPart[], option?: { tryValue?: boolean, macro?: Macro }) {
		const result: (string | number)[] = [];
		let tryValue = Compiler.enviroment.compileTime < Config.ProjectSetting.compileTimes - 1;
		if (option?.tryValue !== undefined)
			tryValue = option.tryValue;

		let noError = true;

		const SaveValue = (part: ExpressionPart, value: number) => {
			part.value = value;
			part.type = PriorityType.Level_0_Sure;
			result.push(part.value);
		}

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			switch (part.type) {
				case PriorityType.Level_0_Sure:
					result.push(part.value);
					break;
				case PriorityType.Level_1_Label:
					const temp = ExpressionUtils.GetNumber(part.token.text);
					if (temp.success) {
						SaveValue(part, temp.value);
						break;
					}

					const label = LabelUtils.FindLabel(part.token, { macro: option?.macro });
					if (label?.value === undefined) {
						noError = false;
						if (!tryValue) {
							Compiler.stopCompiling = true;
							const errorMsg = Localization.GetMessage("Label {0} not found", part.token.text);
							MyDiagnostic.PushException(part.token, errorMsg);
						}
					} else {
						SaveValue(part, label.value);
					}
					break;
				case PriorityType.Level_2_Address:
					switch (part.token.text) {
						case "*": SaveValue(part, Compiler.enviroment.address.org); break;
						case "$": SaveValue(part, Compiler.enviroment.address.base); break;
					}
					break;
				case PriorityType.Level_3_CharArray:
					if (part.chars!.length > 1) {
						const error = Localization.GetMessage("Expression error");
						MyDiagnostic.PushException(part.token, error);
						noError = false;
					} else {
						const value = ExpressionUtils.GetCharCode(part.chars![0]);
						SaveValue(part, value);
					}
					break;
				case PriorityType.Level_5:
					result.push("(" + part.token.text + ")");
					break;
				default:
					result.push(part.token.text);
					break;
			}
		}
		if (!noError)
			return;

		return result;
	}
	//#endregion 检查所有小节并获取值，简化计算量

	//#region 检查在 Macro 里的参数
	private static CheckExpressionMacro(expression: Expression, macro: Macro) {
		for (let i = 0; i < expression.parts.length; i++) {
			const part = expression.parts[i];
			if (part.type !== PriorityType.Level_1_Label)
				continue;

			const param = macro.params.get(part.token.text);
			if (!param)
				continue;

			// if (typeof (param.value) === "number") {
			// 	part.value = param.value;
			// 	part.type = PriorityType.Level_0_Sure;
			// } else {
			// 	part.chars = param.value;
			// 	expression.stringIndex = i;
			// 	expression.stringLength = param.value.length;
			// }

		}
	}
	//#endregion 检查在 Macro 里的参数

	//#region 替换 Macro 里的参数
	/**
	 * 替换 Macro 里的参数
	 * @param expParts 表达式小节
	 * @param stringIndex 字符串索引
	 * @param macro 宏
	 * @returns 返回false是错误，true是正确
	 */
	private static ReplaceExpression(expParts: ExpressionPart[], macro: Macro) {
		for (let i = 0; i < expParts.length; i++) {
			const part = expParts[i];
			if (part.type !== PriorityType.Level_1_Label)
				continue;

			const param = macro.params.get(part.token.text);
			if (!param)
				continue;

			expParts.splice(i, 1, ...param.exp.parts);
			i += param.exp.parts.length - 1;
		}
	}
	//#endregion 替换 Macro 里的参数

}