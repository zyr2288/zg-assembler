import { Utils } from "../Base/Utils";
import { Compiler } from "../Compiler/Compiler";

export interface LabelTreeItem {

	name: string;
	description?: string;

	fileIndex: number;
	line: number;
	start: number;
	length: number;
}

export class LabelTreeProvider {

	static GetVariableInfo(filePath: string) {
		let result: LabelTreeItem[] = [];
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		if (fileIndex < 0) {
			Compiler.enviroment.allLabel.global.forEach((label, name, map) => {
				const item: LabelTreeItem = {
					name: label.token.text,
					description: label.comment,
					fileIndex: label.fileIndex,
					line: label.token.line,
					start: label.token.start,
					length: label.token.length
				};
				result.push(item);
			});
		} else {
			const localLabels = Compiler.enviroment.allLabel.local.get(fileIndex);
			if (!localLabels)
				return result;

			localLabels.forEach((label, name, map) => {
				const item: LabelTreeItem = {
					name: label.token.text,
					description: label.comment,
					fileIndex: label.fileIndex,
					line: label.token.line,
					start: label.token.start,
					length: label.token.length
				};
				result.push(item);
			});
		}
		return result;
	}

	//#region 输出文件的变量信息
	static OutputVariableInfo(filePath: string, radix: number) {
		let result: string[] = [], index = 0;
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath, false);
		// 全局，其余局部
		if (fileIndex < 0) {
			Compiler.enviroment.allLabel.global.forEach((label, name, map) => {
				result[index] = label.token.text;
				if (label.value !== undefined) {
					const value = Utils.ConvertValue(label.value);
					switch (radix) {
						case 2:
							result[index] += " = @" + value.bin;
							break;
						case 10:
							result[index] += " = " + value.dec;
							break;
						case 16:
							result[index] += " = $" + value.hex;
							break;
					}
				}
				index++;
			});
		} else {

		}
		result.sort((a, b) => a.localeCompare(b));
		return result;
	}
	//#endregion 输出文件的变量信息

}
