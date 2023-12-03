import { Compiler } from "./Compiler";
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

	/**key1是fileHash key2是word的key */
	private static allErrors = new Map<number, Map<number, DiagnosticMsg>>();
	private static allWarning = new Map<number, Map<number, DiagnosticMsg>>();

	//#region 添加错误
	/**添加错误 */
	static PushException(token: Token, msg: string) {
		let fileErrors = MyDiagnostic.allErrors.get(token.fileHash);
		if (!fileErrors) {
			fileErrors = new Map();
			MyDiagnostic.allErrors.set(token.fileHash, fileErrors);
		}

		let errorHash = Utils.GetHashcode(token.line, token.start);
		fileErrors.set(errorHash, { word: token, msg });
	}
	//#endregion 添加错误

	//#region 获取错误
	/**
	 * 获取所有错误
	 * @param fileHash 文件的Hash，若为undefined则获取所有文件
	 * @returns 
	 */
	static GetExceptions(fileHash?: number) {
		const errors: OutDiagnosticMsg[] = [];
		if (fileHash !== undefined) {
			const errorMap = MyDiagnostic.allErrors.get(fileHash);
			if (errorMap) {
				errorMap.forEach((errorMsg, wordHash) => {
					errors.push({
						filePath: Compiler.enviroment.GetFile(fileHash),
						line: errorMsg.word.line,
						start: errorMsg.word.start,
						length: errorMsg.word.text.length,
						message: errorMsg.msg
					});
				})
			}
		} else {
			MyDiagnostic.allErrors.forEach((errorMap, fileHash) => {
				errorMap.forEach((errorMsg, wordHash) => {
					errors.push({
						filePath: Compiler.enviroment.GetFile(fileHash),
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
	static PushWarning(token: Token, msg: string) {
		let fileWarnings = MyDiagnostic.allWarning.get(token.fileHash);
		if (!fileWarnings) {
			fileWarnings = new Map();
			MyDiagnostic.allWarning.set(token.fileHash, fileWarnings);
		}

		let warningHash = Utils.GetHashcode(token.line, token.start);
		fileWarnings.set(warningHash, { word: token, msg });
	}
	//#endregion 添加警告

	//#region 获取警告
	/**获取所有错误 */
	static GetWarnings() {
		const warnings: OutDiagnosticMsg[] = [];
		MyDiagnostic.allWarning.forEach((warningMap, fileHash) => {
			warningMap.forEach((warningMsg, wordHash) => {
				warnings.push({
					filePath: Compiler.enviroment.GetFile(fileHash),
					line: warningMsg.word.line,
					start: warningMsg.word.start,
					length: warningMsg.word.text.length,
					message: warningMsg.msg
				});
			});
		});
		return warnings;
	}
	//#endregion 获取警告

	static ClearFileExceptions(fileHash: number) {
		MyDiagnostic.allErrors.set(fileHash, new Map());
		MyDiagnostic.allWarning.set(fileHash, new Map());
	}

	static ClearAll() {
		MyDiagnostic.allErrors.clear();
	}

}