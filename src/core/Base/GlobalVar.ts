import { Label } from "./Label";
import { Utils } from "../Utils/Utils";
import { Config } from "./Config";
import { Macro } from "./Macro";

export class Environment {

	/**所有文件，key为fileHash */
	private files: Record<number, string> = {};

	/** key1:文件hash, key2:lebal hash */
	fileLebals: Record<number, number[]> = {};
	fileMacro: Record<number, number[]> = {};

	/**全局变量 */
	allLebals: Record<number, Label> = {};
	/**所有Macro */
	allMacro: Record<number, Macro> = {};

	/** key1:文件File，key2:文本Hash, key3:Lebal */
	allNamelessLebalDown: Record<number, Record<number, Label>> = {};
	allNamelessLebalUp: Record<number, Record<number, Label>> = {};

	originalAddress: number = -1;
	baseAddress: number = 0;
	addressOffset = 0;

	compileCount = 0;
	isCompile = false;
	get lastCompile() { return Config.ProjectSetting.compileTimes - 1 == this.compileCount; }

	AddAddress(offset: number) {
		this.baseAddress += offset;
		this.originalAddress += offset;
	}

	//#region 设定文件到全局并返回文件Hash
	/**
	 * 设定文件到全局并返回文件Hash
	 * @param filePath 文件路径
	 * @returns 文件Hash
	 */
	SetFile(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		this.files[hash] = filePath;
		return hash;
	}
	//#endregion 设定文件到全局并返回文件Hash

	//#region 根据文件Hash获取文件
	GetFile(fileHash: number) {
		return this.files[fileHash];
	}
	//#endregion 根据文件Hash获取文件

	//#region 清除所有
	ClearAll() {
		this.allLebals = {};
		this.allNamelessLebalDown = {};
		this.allNamelessLebalUp = {};

		this.allMacro = {};

		this.originalAddress = -1;
		this.baseAddress = 0;
		this.addressOffset = 0;

		this.compileCount = 0;
	}
	//#endregion 清除所有
}

export class GlobalVar {

	private static compileEnv: Environment = new Environment();
	private static editorEnv: Environment = new Environment();

	static isCompiling = false;
	static env: Environment = GlobalVar.editorEnv;

	//#region 切换编译环境
	/**
	 * 切换编译环境
	 * @param env 环境
	 * @returns 
	 */
	static SwitchEnvironment(env: "Compile" | "Editor") {
		if (GlobalVar.isCompiling)
			return;

		switch (env) {
			case "Compile":
				GlobalVar.env = GlobalVar.compileEnv;
				break;
			case "Editor":
				GlobalVar.env = GlobalVar.editorEnv;
				break;
		}
	}
	//#endregion 切换编译环境

	//#region 复制标签变量等到另一个环境
	static CopyGlobalLebalToOther(env: "Compile" | "Editor") {

	}
	//#endregion 复制标签变量等到另一个环境

}