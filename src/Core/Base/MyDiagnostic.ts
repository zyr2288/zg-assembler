import { Compiler } from "../Compiler/Compiler";
import { Token } from "./Token";
import { Utils } from "./Utils";

export interface OutDiagnosticMsg {
	filePath: string;
	line: number;
	start: number;
	length: number;
	message: string;
}

interface DiagnosticMsg {
	word: Token;
	msg: string;
}

export class MyDiagnostic {

	static get hasError() { return MyDiagnostic.allErrors.size !== 0; }

	/**key1是 fileIndex key2是word的start */
	private static allErrors = new Map<number, Map<number, DiagnosticMsg>>();
	private static allWarning = new Map<number, Map<number, DiagnosticMsg>>();

	//#region 添加错误
	/**
	 * 添加错误
	 * @param token 错误的文字Token
	 * @param msg 错误信息
	 * @param fileLine 错误的行以及文件路径
	 */
	static PushException(token: Token, msg: string, fileIndex?: number) {
		if (fileIndex === undefined)
			fileIndex = Compiler.enviroment.fileIndex;

		let fileErrors = MyDiagnostic.allErrors.get(fileIndex);
		if (!fileErrors) {
			fileErrors = new Map();
			MyDiagnostic.allErrors.set(fileIndex, fileErrors);
		}

		const hash = Utils.GetHashcode(token.line, token.start, token.length)
		fileErrors.set(hash, { word: token, msg });
	}
	//#endregion 添加错误

	//#region 获取错误
	/**
	 * 获取所有错误
	 * @param fileHash 文件的Hash，若为undefined则获取所有文件
	 * @returns 
	 */
	static GetExceptions(fileIndex?: number) {
		const errors: OutDiagnosticMsg[] = [];
		if (fileIndex !== undefined) {
			const errorMap = MyDiagnostic.allErrors.get(fileIndex);
			if (errorMap) {
				errorMap.forEach((errorMsg, lineNumber) => {
					errors.push({
						filePath: Compiler.enviroment.GetFilePath(fileIndex),
						line: lineNumber,
						start: errorMsg.word.start,
						length: errorMsg.word.text.length,
						message: errorMsg.msg
					});
				})
			}
		} else {
			MyDiagnostic.allErrors.forEach((errorMap, fileIndex) => {
				errorMap.forEach((errorMsg, lineNumber) => {
					errors.push({
						filePath: Compiler.enviroment.GetFilePath(fileIndex),
						line: errorMsg.word.line,
						start: errorMsg.word.start,
						length: errorMsg.word.text.length,
						message: errorMsg.msg
					});
				});
			});
		}
		return errors;
	}
	//#endregion 获取错误

	//#region 添加警告
	static PushWarning(token: Token, msg: string, fileIndex?: number) {
		if (fileIndex === undefined)
			fileIndex = Compiler.enviroment.fileIndex;

		let fileWarnings = MyDiagnostic.allWarning.get(fileIndex);
		if (!fileWarnings) {
			fileWarnings = new Map();
			MyDiagnostic.allWarning.set(fileIndex, fileWarnings);
		}

		const hash = Utils.GetHashcode(token.line, token.start, token.length)
		fileWarnings.set(hash, { word: token, msg });
	}
	//#endregion 添加警告

	//#region 获取警告
	/**获取所有错误 */
	static GetWarnings() {
		const warnings: OutDiagnosticMsg[] = [];
		MyDiagnostic.allWarning.forEach((warningMap, fileIndex) => {
			warningMap.forEach((warningMsg, line) => {
				warnings.push({
					filePath: Compiler.enviroment.GetFilePath(fileIndex),
					line: line,
					start: warningMsg.word.start,
					length: warningMsg.word.text.length,
					message: warningMsg.msg
				});
			});
		});
		return warnings;
	}
	//#endregion 获取警告

	static ClearFileExceptions(fileIndex: number) {
		MyDiagnostic.allErrors.set(fileIndex, new Map());
		MyDiagnostic.allWarning.set(fileIndex, new Map());
	}

	static ClearAll() {
		MyDiagnostic.allErrors.clear();
		MyDiagnostic.allWarning.clear();
	}

}