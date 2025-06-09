import { Compiler } from "../Compiler/Compiler";

export class LabelTree {

	//#region 输出文件的变量信息
	static OutputVariableInfo(filePath: string) {
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		return Compiler.enviroment.allLabel;
	}
	//#endregion 输出文件的变量信息

}
