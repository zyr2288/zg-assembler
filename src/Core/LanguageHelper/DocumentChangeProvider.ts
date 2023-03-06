import { LSPUtils } from "../../LSP/LSPUtils";
import { Compiler } from "../Base/Compiler";
import { MyDiagnostic } from "../Base/MyException";
import { Platform } from "../Platform/Platform";
import { HelperUtils } from "./HelperUtils";

const FreshTime = 1000;

interface ErrorMessage {
	line: number;
	start: number;
	length: number;
	message: string;
}

export class DocumentChangeProvider {

	private static freshThreadId: NodeJS.Timeout;
	private static updateFiles = new Map<string, string>();

	/**
	 * 指令自动大写
	 * @param lineText 一行内容
	 * @returns 
	 */
	static AutoUpperCase(lineText: string) {
		let match = new RegExp(Platform.regexString, "ig").exec(lineText);
		if (!match?.groups?.["command"] && !match?.groups?.["instruction"])
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
			HelperUtils.fileUpdateFinished = false;
			DocumentChangeProvider.updateFiles.set(filePath, text);
			clearTimeout(DocumentChangeProvider.freshThreadId);
			DocumentChangeProvider.freshThreadId = setTimeout(async () => {
				let files: { text: string, filePath: string }[] = [];
				DocumentChangeProvider.updateFiles.forEach((value, key) => {
					files.push({ text: value, filePath: key });
				});
				await LSPUtils.WaitingCompileFinished();
				await Compiler.DecodeText(files);
				DocumentChangeProvider.GetDiagnostics();
				HelperUtils.fileUpdateFinished = true;
				DocumentChangeProvider.updateFiles.clear();
				resolve();
			}, FreshTime);
		});
	}

	static GetDiagnostics() {
		let errors = MyDiagnostic.GetExceptions();
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
