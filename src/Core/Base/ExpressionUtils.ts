//#region 算数优先级
enum PriorityState {
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

export class ExpressionUtils {

	/**符号优先级 */
	private static onlyOnePriority: Map<string, PriorityState> = new Map();

	//#region 初始化
	static Initialize() {
		ExpressionUtils.onlyOnePriority.set("(", PriorityState.Level_4_Brackets);
		ExpressionUtils.onlyOnePriority.set(")", PriorityState.Level_4_Brackets);
		ExpressionUtils.onlyOnePriority.set("*", PriorityState.Level_6);
		ExpressionUtils.onlyOnePriority.set("/", PriorityState.Level_6);
		ExpressionUtils.onlyOnePriority.set("%", PriorityState.Level_6);
		ExpressionUtils.onlyOnePriority.set("+", PriorityState.Level_7);
		ExpressionUtils.onlyOnePriority.set("-", PriorityState.Level_7);
		ExpressionUtils.onlyOnePriority.set("<<", PriorityState.Level_8_Shift);
		ExpressionUtils.onlyOnePriority.set(">>", PriorityState.Level_8_Shift);
		ExpressionUtils.onlyOnePriority.set(">", PriorityState.Level_9_Confident1);
		ExpressionUtils.onlyOnePriority.set("<", PriorityState.Level_9_Confident1);
		ExpressionUtils.onlyOnePriority.set(">=", PriorityState.Level_9_Confident1);
		ExpressionUtils.onlyOnePriority.set("<=", PriorityState.Level_9_Confident1);
		ExpressionUtils.onlyOnePriority.set("!=", PriorityState.Level_10_Confident2);
		ExpressionUtils.onlyOnePriority.set("==", PriorityState.Level_10_Confident2);
		ExpressionUtils.onlyOnePriority.set("&", PriorityState.Level_11_And);
		ExpressionUtils.onlyOnePriority.set("^", PriorityState.Level_12_Eor);
		ExpressionUtils.onlyOnePriority.set("|", PriorityState.Level_13_Or);
		ExpressionUtils.onlyOnePriority.set("&&", PriorityState.Level_14);
		ExpressionUtils.onlyOnePriority.set("||", PriorityState.Level_15);
	}
	//#endregion 初始化

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

}