import { Token } from "./Token";

/**工具类 */
export class Utils {

	//#region 深拷贝
	/**深拷贝 */
	static DeepClone<T>(source: T): T {
		// @ts-ignore
		const out = new source.constructor;

		for (const key in source) {
			// @ts-ignore
			if (source.hasOwnProperty(key)) {
				const type = Utils.GetType(source[key]);
				switch (type) {
					case "Object":
					case "Array":
						out[key] = Utils.DeepClone(source[key]);
						break;
					case "Map":
						const sourceMap = source[key] as Map<any, any>;
						const outMap = out[key] as Map<any, any>;
						for (const mapKey of sourceMap.keys())
							outMap.set(mapKey, Utils.DeepClone(sourceMap.get(mapKey)))

						break;
					default:
						out[key] = source[key];
						break;
				}
			}
		}
		return out;
	}

	private static GetType(n: any) {
		return Object.prototype.toString.call(n).slice(8, -1);
	}
	//#endregion 深拷贝

	//#region 转义可使用正则的字符串
	static TransformRegex(source: string) {
		return source.replace(".", "\\.")
			.replace("[", "\\[")
			.replace("]", "\\]")
			.replace(",", "\\,")
			.replace("(", "\\(")
			.replace(")", "\\)")
			.replace("-", "\\-")
			.replace("+", "\\+");
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

	//#region 获取对象Hash值
	/**
	 * 获取对象Hash值
	 * @param object 要获取的Hash的对象，string或number
	 * @returns 
	 */
	static GetHashcode(...object: Array<string | number>): number {
		let hash = 0;

		for (let i = 0; i < object.length; ++i) {
			const value = object[i];
			switch (typeof (value)) {
				case "string":
					for (var j = 0; j < value.length; ++j) {
						// hash = ((hash << 5) - hash) + value.charCodeAt(j) | 0;
						hash = Math.imul(31, hash) + value.charCodeAt(j) | 0;
					}
					break;
				case "number":
					// hash = ((hash << 5) - hash) + value | 0;
					hash = Math.imul(31, hash) + value | 0;
					break;
			}
		}

		return hash;
	}
	//#endregion 获取对象Hash值

	//#region 翻转字符串
	/**
	 * 翻转字符串
	 * @param text 要翻转的字符串
	 * @returns 翻转结果
	 */
	static StringReverse(text: string) {
		return text.split("").reverse().join("")
	}
	//#endregion 翻转字符串

	//#region 获取数字占用字节数
	static GetNumberByteLength(value: number) {
		let length = 0;
		do {
			value >>>= 8;
			length++;
		} while (value !== 0)
		return length;
	}
	//#endregion 获取数字占用字节数

	//#region 用逗号分隔参数
	/**
	 * 用逗号分隔参数
	 * @param token 要分割的Token
	 * @param option.count 分割次数
	 * @returns 
	 */
	static SplitWithComma(token: Token, option?: { count?: number }) {
		let result: Token[] = [];

		let inString = false;
		let char: string = "";
		let lastChar: string = "";
		let start = 0;

		if (option?.count === 0)
			return [token];

		for (let i = 0, j = 0; i < token.text.length; ++i) {
			char = token.text.charAt(i);
			if (char === "\"" && lastChar !== "\\") {
				inString = !inString;
			} else if (char === "," && !inString) {
				result.push(token.Substring(start, i - start));
				start = i + 1;
				if (option?.count && ++j >= option?.count)
					break;

			}
			lastChar = char;
		}
		result.push(token.Substring(start));

		return result;
	}
	//#endregion 用逗号分隔参数

	//#region 讲结果值运算成其他进制
	/**
	 * 讲结果值运算成其他进制
	 * @param value 要运算的值
	 * @returns 2 10 16进制结果
	 */
	static ConvertValue(value: number) {
		let result = { bin: "", dec: "", hex: "" };

		let temp = value;
		do {
			let temp2 = (temp & 0xFF).toString(2);
			let array = temp2.padStart(8, "0").split("");
			array.splice(4, 0, " ");
			temp2 = array.join("");
			result.bin = " " + temp2 + result.bin;
			temp >>>= 8;
		} while (temp != 0)
		result.bin = result.bin.substring(1);
		result.dec = value.toString();
		result.hex = value.toString(16).toUpperCase();

		return result;
	}
	//#endregion 讲结果值运算成其他进制

}

