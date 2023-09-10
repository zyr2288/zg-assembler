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

	static hitBreakpointKey = 0;

	private static breakPoints = {
		counter: new Map<number, Map<number, number>>()
	}

	static Clear() {
		DebugHelper.allDebugLines.base.clear();
		DebugHelper.allDebugLines.fileLine2base.clear();
		DebugHelper.allDebugLines.base2Fileline.clear();
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

			DebugHelper.allDebugLines.base.set(baseAddress, line);
			const hash = Utils.GetHashcode(line.orgText.fileHash, line.orgText.line);
			DebugHelper.allDebugLines.base2Fileline.set(baseAddress, hash);
			DebugHelper.allDebugLines.fileLine2base.set(hash, baseAddress);
		}
	}

	/**添加Debug */
	static DebugSet(filePath: string, lineNumber: number) {
		const fileHash = Utils.GetHashcode(FileUtils.ArrangePath(filePath));
		const line = DebugHelper.GetLineInfo(fileHash, lineNumber);
		if (!line)
			return;

		const fileMap = DebugHelper.breakPoints.counter.get(fileHash) ?? new Map<number, number>();
		let baseLineCount = fileMap.get(line.orgAddress);
		if (baseLineCount === undefined)
			baseLineCount = 1;
		else
			baseLineCount++;

		fileMap.set(line.orgAddress, baseLineCount);
		DebugHelper.breakPoints.counter.set(fileHash, fileMap);
		// 减 0x10 是为了配合 NES头部
		return { orgAddress: line.orgAddress, baseAddress: line.baseAddress - 0x10 };
	}

	/**移除Debug */
	static DebugRemove(filePath: string, lineNumber: number) {
		const fileHash = Utils.GetHashcode(FileUtils.ArrangePath(filePath));
		const line = DebugHelper.GetLineInfo(fileHash, lineNumber) as DebugLine;
		if (!line)
			return;

		const fileMap = DebugHelper.breakPoints.counter.get(fileHash);
		if (!fileMap)
			return;

		let baseLineCount = fileMap.get(line.orgAddress);
		if (baseLineCount === undefined)
			return;

		if (baseLineCount-- <= 0)
			fileMap.delete(line.orgAddress);

		return { orgAddress: line.orgAddress, baseAddress: line.baseAddress - 0x10 };
	}

	private static GetLineInfo(fileHash: number, line: number) {
		const hash = Utils.GetHashcode(fileHash, line);
		const base = this.allDebugLines.fileLine2base.get(hash);
		if (!base)
			return;

		return this.allDebugLines.base.get(base) as DebugLine;
	}
}