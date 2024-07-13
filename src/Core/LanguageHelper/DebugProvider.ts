import { Compiler } from "../Compiler/Compiler";

export class DebugProvider {

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

}