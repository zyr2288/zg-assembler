import { FileUtils } from "../Base/FileUtils";
import { Utils } from "../Base/Utils";
import { ICommonLine, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";

type DebugLine = InstructionLine;

export class DebugHelper {

	static allDebugLines = {
		/**Key为基础地址(BaseAddress) */
		base: new Map<number, ICommonLine>(),
		/**Key为 FilePath 和 LineNumber 计算出来的Hash，Value为基础地址(BaseAddress) */
		fileLine2base: new Map<number, number>(),
		/**Key为基础地址(BaseAddress)，Value为 FilePath 和 LineNumber 计算出来的Hash */
		base2Fileline: new Map<number, number>(),
	}

	static Clear() {
		this.allDebugLines.base.clear();
		this.allDebugLines.fileLine2base.clear();
		this.allDebugLines.base2Fileline.clear();
	}

	static AddLines(baseLines: ICommonLine[]) {
		let baseAddress;
		for (let i = 0; i < baseLines.length; i++) {
			baseAddress = -1;
			const line = baseLines[i] as DebugLine;
			switch (line.type) {
				case LineType.Instruction:
					baseAddress = line.baseAddress;
					break;
			}

			if (baseAddress < 0)
				continue;

			if (line.result.length === 0)
				return;

			this.allDebugLines.base.set(baseAddress, line);
			const hash = Utils.GetHashcode(line.orgText.fileHash, line.orgText.line);
			this.allDebugLines.base2Fileline.set(baseAddress, hash);
			this.allDebugLines.fileLine2base.set(hash, baseAddress);
		}
	}

	static DebugSet(filePath: string, lineNumber: number) {
		const line = DebugHelper.GetLineInfo(filePath, lineNumber) as DebugLine;
		if (!line)
			return;

		return line.baseAddress;
	}

	static DebugRemove(filePath: string, lineNumber: number) {

	}

	private static GetLineInfo(filePath: string, line: number) {
		const fileHash = Utils.GetHashcode(FileUtils.ArrangePath(filePath));
		const hash = Utils.GetHashcode(fileHash, line);

		const base = this.allDebugLines.fileLine2base.get(hash);
		if (!base)
			return;

		return this.allDebugLines.base.get(base);
	}
}