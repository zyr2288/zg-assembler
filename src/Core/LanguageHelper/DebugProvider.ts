import { Config } from "../Base/Config";
import { FileUtils } from "../Base/FileUtils";
import { Compiler } from "../Compiler/Compiler";

export class DebugProvider {

	static tempFile?: Uint8Array;

	//#region 获取Debug所在文件以及行号
	/**
	 * 获取Debug所在文件以及行号
	 * @param baseAddress 文件内地址
	 * @returns 
	 */
	static GetDebugLine(baseAddress: number) {
		return Compiler.enviroment.compileResult.GetLineWithBaseAddress(baseAddress);
	}
	//#endregion 获取Debug所在文件以及行号

	//#region 获取Debug所在文件以及行号
	/**
	 * 获取Debug所在文件以及行号
	 * @param filePath 文件路径
	 * @param lineNumber 行号，从0开始
	 * @returns 
	 */
	static GetDebugLineWithFile(filePath: string, lineNumber: number) {
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		return Compiler.enviroment.compileResult.GetLineWithFileAndLine(fileIndex, lineNumber);
	}
	//#endregion 获取Debug所在文件以及行号

	//#region 设定断点
	/**
	 * 设定断点
	 * @param filePath 文件路径
	 * @param lineNumber 行
	 */
	static SetBreakPoint(filePath: string, lineNumber: number) {
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		return Compiler.enviroment.compileResult.GetLineWithFileAndLine(fileIndex, lineNumber);
	}
	//#endregion 设定断点

	//#region 热重载文件
	/**热重载观察文件变化 */
	static async WatchHotReloadFile(rootPath: string, offset: number) {
		const filePath = FileUtils.Combine(rootPath, Config.ProjectSetting.outputEntryFile);
		if (!DebugProvider.tempFile) {
			DebugProvider.tempFile = await FileUtils.ReadFile(filePath);
			return;
		}

		const buffer = await FileUtils.ReadFile(filePath);
		if (DebugProvider.tempFile.length !== buffer.length) {
			DebugProvider.tempFile = buffer;
			return;
		}

		const result = new Map<number, number[]>();
		let start = 0;
		for (let i = 0; i < buffer.length; i++) {
			if (DebugProvider.tempFile[i] === buffer[i]) {
				start = -1;
				continue;
			}

			if (start < 0)
				start = i;

			let tempBuffer = result.get(start - offset);
			if (!tempBuffer) {
				tempBuffer = [];
				result.set(start - offset, tempBuffer);
			}
			tempBuffer.push(buffer[i]);
		}
		return result;
	}
	//#endregion 热重载文件

}