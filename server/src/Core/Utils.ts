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

}