export class Utils {

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

	//#region 转义可使用正则的字符串
	static TransformRegex(source: string) {
		return source.replace(".", "\\.")
			.replace("$", "\\$")
			.replace("[", "\\[")
			.replace("]", "\\]")
			.replace(",", "\\,")
			.replace("(", "\\(")
			.replace(")", "\\)")
			.replace("-", "\\-")
			.replace("+", "\\+");
	}
	//#endregion 转义可使用正则的字符串

	//#region 返回数字占用每个字节以及展通长度
	/**
	 * 返回数字占用每个字节以及展通长度
	 * @param value 要判断的值
	 * @returns 返回结果
	 */
	static GetNumberByteLength(value: number) {
		let length = 0;
		do {
			value >>>= 8;
			length++;
		} while (value !== 0)
		return length;
	}
	//#endregion 返回数字占用每个字节以及展通长度

	//#region 给一个Set添加若干元素
	static SetAddElement<T>(set: Set<T>, ...ele: T[]) {
		for (let i = 0; i < ele.length; i++)
			set.add(ele[i])
	}
	//#endregion 给一个Set添加若干元素

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

		// const out = structuredClone(source);
		return out;
	}

	private static GetType(n: any) {
		return Object.prototype.toString.call(n).slice(8, -1);
	}
	//#endregion 深拷贝

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