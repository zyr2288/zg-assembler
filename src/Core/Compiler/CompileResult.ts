import { InstructionLine } from "../Lines/InstructionLine"
import { Compiler } from "./Compiler";

/**
 * 存储编译结果，用于Debug
 */
export class CompileResult {
	/**key是BaseAddress */
	baseAddLines = new Map<number, { fileIndex: number, lineNumber: number, line: InstructionLine }>();
	/**key1是fileIndex，key2是lineNumber */
	fileLines = new Map<number, Map<number, { baseAddress: number, line: InstructionLine }>>();

	finished = false;

	SetLine(option: { baseAddress: number, fileIndex: number, lineNumber: number, line: InstructionLine }) {
		this.baseAddLines.set(
			option.baseAddress,
			{ fileIndex: option.fileIndex, lineNumber: option.lineNumber, line: option.line }
		);

		let fileLines = this.fileLines.get(option.fileIndex);
		if (!fileLines) {
			fileLines = new Map();
			this.fileLines.set(option.fileIndex, fileLines);
		}
		fileLines.set(option.lineNumber, { baseAddress: option.baseAddress, line: option.line });
	}

	GetLineWithBaseAddress(baseAddress: number) {
		const temp = this.baseAddLines.get(baseAddress);
		if (!temp)
			return;

		return {
			filePath: Compiler.enviroment.GetFilePath(temp.fileIndex),
			lineNumber: temp.lineNumber,
			line: temp.line
		};
	}

	GetLineWithFileAndLine(fileIndex: number, lineNumber: number) {
		const lines = this.fileLines.get(fileIndex);
		if (!lines)
			return;

		return lines.get(lineNumber);
	}

	ClearAll() {
		this.baseAddLines.clear();
		this.fileLines.clear();
		this.finished = false;
	}
}