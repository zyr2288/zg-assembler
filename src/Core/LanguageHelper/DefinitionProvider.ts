import { LabelUtils } from "../Base/Label";
import { Token } from "../Base/Token";
import { Compiler } from "../Compiler/Compiler";
import { HelperUtils } from "./HelperUtils";

export class DefinitionProvider {

	/***** public *****/

	//#region 查询定义所在位置
	/**
	 * 查询定义所在位置
	 * @param filePath 文件路径
	 * @param text 该行文本
	 * @param line 行号
	 * @param current 光标所在行位置
	 * @returns 
	 */
	static GetDefinitionPosition(filePath: string, text: string, line: number, current: number) {
		Compiler.ChangeEnviroment("edit");

		const result = { filePath: "", line: 0, start: 0, length: 0 };
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);

		const match = HelperUtils.FindMatchToken(fileIndex, text, line, current);
		if (match.type === "none")
			return;

		switch (match.type) {
			case "label":
				if (match.token) {
					const label = LabelUtils.FindLabel(match.token, { fileIndex });
					if (label) {
						DefinitionProvider.SetTokenToResult(label.token, result);
						result.filePath = Compiler.enviroment.GetFilePath(label.fileIndex);
					}

				}
				break;
			case "macro":
				const tempMacro = Compiler.enviroment.allMacro.get(match.token!.text);
				if (tempMacro) {
					DefinitionProvider.SetTokenToResult(tempMacro.name, result);
					result.filePath = Compiler.enviroment.GetFilePath(tempMacro.fileIndex);
				}
				break;
			case "filePath":
				result.filePath = match.token!.text;
				break;
		}

		return result;
	}
	//#endregion 查询定义所在位置

	/***** private *****/

	private static SetTokenToResult(token: Token, result: { filePath: string, line: number, start: number, length: number }) {
		result.start = token.start;
		result.line = token.line;
		result.length = token.length;
	}
}