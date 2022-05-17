import { Config } from "../Base/Config";

export class FileUtils {

	//#region 读取文件
	/**
	 * 读取文件
	 * @param filePath 文件路径
	 * @returns 文件的二进制
	 */
	static ReadFile: (filePath: string) => Promise<Uint8Array>;
	//#endregion 读取文件

	//#region 保存文件
	/**
	 * 保存文件
	 * @param filePath 文件路径
	 * @param data 文件二进制内容
	 */
	static SaveFile: (filePath: string, data: Uint8Array) => Promise<void>;
	//#endregion 保存文件

	//#region 拼合路径
	/**
	 * 拼合路径
	 * @param paths 所有文件路径
	 */
	static Combine(...paths: string[]): string {
		let result: string[] = [];
		paths.forEach(value => {
			let part = value.split(/[\\\/]/g);
			part.forEach(p => {
				if (p == "..")
					result.pop();
				else
					result.push(p);
			});
		});
		return result.join(Config.CommonSplit);
	}
	//#endregion 拼合路径

	//#region 获取目录下所有文件和文件夹
	static GetFolderFiles: (path: string) => Promise<{ name: string, type: "folder" | "file" }[]>
	//#endregion 获取目录下所有文件和文件夹

	//#region 获取路径的文件夹
	/**
	 * 获取路径的文件夹
	 * @param path 要分析的路径
	 * @returns 获取的路径
	 */
	static async GetPathFolder(path: string) {
		let type = await FileUtils.PathType(path);
		if (type == "none")
			return "";

		let parts = path.split(/[\\\/]/g);
		if (type == "file")
			parts.splice(parts.length - 1, 1);

		return parts.join(Config.CommonSplit);
	}
	//#endregion 获取路径的文件夹

	//#region 获取路径文件的文件名
	/**
	 * 获取路径文件的文件名
	 * @param path 要分析的路径
	 * @returns 获取的路径
	 */
	static async GetFileName(path: string) {
		let type = await FileUtils.PathType(path);
		if (type != "file")
			return "";

		let parts = path.split(/[\\\/]/g);
		return parts[parts.length - 1];
	}
	//#endregion 获取路径文件的文件名

	//#region 检查路径属性
	/**
	 * 检查路径属性
	 * @param filePath 文件路径
	 * @return 文件属性，path file none
	 */
	static PathType: (filePath: string) => Promise<"path" | "file" | "none">;
	//#endregion 检查路径属性

	//#region 将字符串转换成Bytes
	static StringToBytes: (text: string) => Uint8Array;
	//#endregion 将字符串转换成Bytes

	//#region 将字节转换成字符串
	static BytesToString: (data: Uint8Array) => string;
	//#endregion 将字节转换成字符串

	//#region 整理路径成统一格式
	/**整理路径成统一格式 */
	static ArrangePath(path: string) {
		let parts = path.split(/[\\\/]/g);
		return parts.join(Config.CommonSplit);
	}
	//#endregion 整理路径成统一格式

}