import { Compiler } from "../Base/Compiler";
import { MyException } from "../Base/MyException";
import { Platform } from "../Platform/Platform";
import { fileUpdateFinished } from "./HelperUtils";

const FreshTime = 1000;
let freshThreadId: NodeJS.Timeout;
let updateFiles = new Map<string, string>();

interface ErrorMessage {
	line: number;
	start: number;
	length: number;
	message: string;
}

export class DocumentChangeProvider {

	/**
	 * 指令自动大写
	 * @param lineText 一行内容
	 * @returns 
	 */
	static AutoUpperCase(lineText: string) {
		let match = new RegExp(Platform.uppperCaseRegexString, "ig").exec(lineText);
		if (!match)
			return;

		return { index: match.index, length: match[0].length, text: match[0].toUpperCase() };
	}

	/**
	 * 监视文件改变
	 * @param text 变更的文档
	 * @param filePath 变更文档路径
	 * @returns 
	 */
	static async WatchFileUpdate(text: string, filePath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			updateFiles.set(filePath, text);
			// fileUpdateFinished = false;
			clearTimeout(freshThreadId);
			freshThreadId = setTimeout(async () => {
				let files: { text: string, filePath: string }[] = [];
				updateFiles.forEach((value, key) => {
					files.push({ text: value, filePath: key });
				});
				await Compiler.DecodeText(files);
				DocumentChangeProvider.GetDiagnostics();
				// fileUpdateFinished = true;
				updateFiles.clear();
				resolve();
			}, FreshTime);
		});
	}

	static GetDiagnostics() {
		let errors = MyException.GetExceptions();
		let result = new Map<string, ErrorMessage[]>();
		for (let i = 0; i < errors.length; ++i) {
			const error = errors[i];
			let diagnostics = result.get(error.filePath);
			if (!diagnostics) {
				diagnostics = [];
				result.set(error.filePath, diagnostics);
			}

			if (error.line < 0)
				continue;

			//@ts-ignore
			delete (error.filePath);
			diagnostics.push(error);
		}
		return result;
	}
}
