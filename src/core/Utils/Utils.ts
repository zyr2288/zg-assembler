import { ErrorLevel, ErrorType, MyException } from "../Base/MyException";
import { Token } from "../Base/Token";

export class Utils {

	//#region 获取对象Hash值
	/**
	 * 获取对象Hash值
	 * @param object 要获取的Hash的对象，string或number
	 * @returns 
	 */
	 static GetHashcode(...object: Array<string | number>): number {
		let hash = 0;

		object.forEach(value => {
			switch (typeof (value)) {
				case "string":
					for (var i = 0; i < value.length; i++) {
						hash = ((hash << 5) - hash) + value.charCodeAt(i);
						hash = hash & hash; // Convert to 32bit integer
					}
					break;
				case "number":
					hash = ((hash << 5) - hash) + value;
					hash &= hash; // Convert to 32bit integer
					break;
			}
		});

		return hash;
	}
	//#endregion 获取对象Hash值

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

	//#region 结果值占用字节数
	/**
	 * 结果值占用字节数
	 * @param value 值
	 * @returns 
	 */
	static DataByteLength(value: number) {
		let length = 0;
		do {
			value >>= 8;
			length++;
		} while (value != 0)
		return length;
	}
	//#endregion 结果值占用字节数

	//#region 分割逗号
	/**
	 * 分割逗号
	 * @param word 要分割的表达式
	 * @param ignoreLast 是否忽略最后一个，默认不忽略
	 * @returns 
	 */
	 static SplitComma(word: Token, ignoreLast: boolean = false) {
		let result = { success: true, parts: word.Split(/\s*\,\s*/g) };

		for (let i = 0; i < result.parts.length; i++) {
			const part = result.parts[i];
			if (!part.isNull)
				continue;

			if (i == result.parts.length - 1 && ignoreLast) {
				result.parts.splice(i, 1);
				continue;
			}

			MyException.PushException(part, ErrorType.ArgumentError, ErrorLevel.Show);
			result.success = false;
			break;
		}
		return result;
	}
	//#endregion 分割逗号

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
			temp >>= 8;
		} while (temp != 0)
		result.bin = result.bin.substring(1);
		result.dec = value.toString();
		result.hex = value.toString(16).toUpperCase();

		return result;
	}
	//#endregion 讲结果值运算成其他进制

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

	//#region 返回所有正则表达式的匹配
	/**
	 * 返回所有正则表达式的匹配
	 * @param pattern 正则表达式
	 * @param text 要匹配的文本
	 * @returns 返回所有匹配结果
	 */
	 static GetTextMatches(pattern: RegExp, text: string) {
		let result: { match: string, index: number }[] = [];
		let temp: RegExpExecArray | null;
		while (temp = pattern.exec(text))
			result.push({ match: temp[0], index: temp.index });

		return result;
	}
	//#endregion 返回所有正则表达式的匹配

	//#region 深拷贝
	static DeepClone(obj: any) {
		var _out = new obj.constructor;

		var getType = function (n: any) {
			return Object.prototype.toString.call(n).slice(8, -1);
		}

		for (var _key in obj) {
			if (obj.hasOwnProperty(_key)) {
				_out[_key] = getType(obj[_key]) === 'Object' || getType(obj[_key]) === 'Array' ? Utils.DeepClone(obj[_key]) : obj[_key];
			}
		}
		return _out;
	}
	//#endregion 深拷贝

}