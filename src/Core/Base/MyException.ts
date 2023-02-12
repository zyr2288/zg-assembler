import { Utils } from "./Utils";
import { Compiler } from "./Compiler";
import { Token } from "./Token";

export interface OutErrorMsg {
	filePath: string;
	line: number;
	start: number;
	length: number;
	message: string;
}

interface ErrorMsg {
	word: Token;
	msg: string;
}

export class MyException {

	/**key1是fileHash key2是word的key */
	private static allErrors = new Map<number, Map<number, ErrorMsg>>();

	//#region 添加错误
	/**添加错误 */
	static PushException(word: Token, fileHash: number, msg: string) {
		let fileErrors = MyException.allErrors.get(fileHash);
		if (!fileErrors) {
			fileErrors = new Map();
			MyException.allErrors.set(fileHash, fileErrors);
		}

		let errorHash = Utils.GetHashcode(word.line, word.start);
		fileErrors.set(errorHash, { word, msg });
	}
	//#endregion 添加错误

	//#region 获取错误
	/**获取所有错误 */
	static GetException() {
		let errors: OutErrorMsg[] = [];
		MyException.allErrors.forEach((errorMap, fileHash) => {
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
		return errors;
	}
	//#endregion 获取错误

}