import { Config } from "./Config";

export class FileUtils {

	//#region 实现接口的方法
	static Implement(option: {
		ReadFile?: typeof FileUtils.ReadFile,
		SaveFile?: typeof FileUtils.SaveFile,
		GetFolderFiles?: typeof FileUtils.GetFolderFiles,
		PathType?: typeof FileUtils.PathType,
		ShowMessage?: typeof FileUtils.ShowMessage
	}) {
		if (option.ReadFile) FileUtils.ReadFile = option.ReadFile;
		if (option.SaveFile) FileUtils.SaveFile = option.SaveFile;
		if (option.GetFolderFiles) FileUtils.GetFolderFiles = option.GetFolderFiles;
		if (option.PathType) FileUtils.PathType = option.PathType;
		if (option.ShowMessage) FileUtils.ShowMessage = option.ShowMessage;
	}
	//#endregion 实现接口的方法

	/***** 未实现接口 *****/

	//#region 读取文件
	/**
	 * 读取文件（需要实现）
	 * @param filePath 文件路径
	 * @returns 文件的二进制
	 */
	static ReadFile: (filePath: string) => Promise<Uint8Array>;
	//#endregion 读取文件

	//#region 保存文件
	/**
	 * 保存文件（需要实现）
	 * @param filePath 文件路径
	 * @param data 文件二进制内容
	 */
	static SaveFile: (filePath: string, data: Uint8Array) => Promise<void>;
	//#endregion 保存文件

	//#region 获取目录下所有文件和文件夹
	/**
	 * 获取目录下所有文件和文件夹（需要实现），仅在智能提示下使用
	 * @param path 路径
	 */
	static GetFolderFiles: (path: string) => Promise<{ name: string, type: "folder" | "file" }[]>
	//#endregion 获取目录下所有文件和文件夹

	//#region 检查路径属性
	/**
	 * 检查路径属性（需要实现）
	 * @param filePath 文件路径
	 * @return 文件属性，path file none
	 */
	static PathType: (filePath: string) => Promise<"path" | "file" | "none">;
	//#endregion 检查路径属性

	//#region 显示消息
	/**
	 * 显示消息（需要实现）
	 * @param message 显示的信息
	 */
	static ShowMessage: (message: string) => void;
	//#endregion 显示消息

	/***** 已实现接口 *****/

	//#region 将字符串转换成Bytes
	/**
	 * 将字符串转换成Bytes
	 * @param text 要转换的字符串
	 */
	static StringToBytes(text: string) {
		let coder = new TextEncoder();
		return coder.encode(text);
	};
	//#endregion 将字符串转换成Bytes

	//#region 将字节转换成字符串
	/**
	 * 将字节转换成字符串
	 * @param data 需要转换的字节数组
	 */
	static BytesToString(data: Uint8Array) {
		let coder = new TextDecoder();
		return coder.decode(data);
	}
	//#endregion 将字节转换成字符串

	//#region 拼合路径
	/**
	 * 拼合路径
	 * @param paths 所有文件路径
	 */
	static Combine(...paths: string[]): string {
		const result: string[] = [];
		for (let pathIndex = 0; pathIndex < paths.length; ++pathIndex) {
			const part = paths[pathIndex].split(/[\\\/]/g);
			for (let partIndex = 0; partIndex < part.length; ++partIndex) {
				switch (part[partIndex]) {
					case "":
						break;
					case "..":
						result.pop();
						break;
					case ".":
						break;
					default:
						result.push(part[partIndex]);
						break;
				}
			}
		}
		return result.join(Config.CommonSplit);
	}
	//#endregion 拼合路径

	//#region 获取路径的文件夹
	/**
	 * 获取路径的文件夹
	 * @param path 要分析的路径
	 * @returns 获取的路径
	 */
	static async GetPathFolder(path: string) {
		const type = await FileUtils.PathType(path);
		if (type === "none")
			return "";

		let parts = path.split(/[\\\/]/g);
		if (type === "file")
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
		const type = await FileUtils.PathType(path);
		if (type !== "file")
			return "";

		const parts = path.split(/[\\\/]/g);
		return parts[parts.length - 1];
	}
	//#endregion 获取路径文件的文件名

	//#region 整理路径成统一格式
	/**整理路径成统一格式 */
	static ArrangePath(path: string) {
		const parts = path.split(/[\\\/]/g);
		const result: string[] = [];
		for (let i = 0; i < parts.length; i++) {
			if (i === 0 && parts[i] === "")
				continue;

			result.push(parts[i]);
		}
		return result.join(Config.CommonSplit);
	}
	//#endregion 整理路径成统一格式

}