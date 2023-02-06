/**工具类 */
export class Utils {

	//#region 深拷贝
	/**深拷贝 */
	static DeepClone<T>(source: T): T {
		// @ts-ignore
		var _out = new source.constructor;

		var getType = function (n: any) {
			return Object.prototype.toString.call(n).slice(8, -1);
		}

		for (var _key in source) {
			// @ts-ignore
			if (source.hasOwnProperty(_key)) {
				_out[_key] = getType(source[_key]) === 'Object' || getType(source[_key]) === 'Array' ? Utils.DeepClone(source[_key]) : source[_key];
			}
		}
		return _out;
	}
	//#endregion 深拷贝

	//#region 转义可使用正则的字符串
	static TransformRegex(source:string) {
		return source.replace(".", "\.");
	}
	//#endregion 转义可使用正则的字符串

	//#region 消除字符串两头空白
	/**
	 * 消除字符串两头空白
	 * @param startIndex 起始位置
	 * @param text 文本
	 */
	static StringTrim(startIndex: number, text: string) {
		let match = /^\s+/.exec(text);
		if (match == null) {
			return { index: startIndex, text: text.trim() };
		} else {
			return { index: startIndex + match[0].length, text: text.trim() };
		}
	}
	//#endregion 消除字符串两头空白

}