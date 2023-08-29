import { ICommonLine, LineType } from "../Lines/CommonLine";
import { InstructionLine } from "../Lines/InstructionLine";

export class DebugAdapter {



	static Step() {

	}
}

export class DebugCommon {

	allDebugLine = new Map<number, ICommonLine>();

	Clear() {
		this.allDebugLine.clear();
	}

	AddLines(baseLines: ICommonLine[]) {
		let baseAddress;
		for (let i = 0; i < baseLines.length; i++) {
			baseAddress = -1;
			const line = baseLines[i];
			switch (line.type) {
				case LineType.Instruction:
					baseAddress = (line as InstructionLine).baseAddress;
					break;
			}

			if (baseAddress < 0)
				continue;

			this.allDebugLine.set(baseAddress, line);
		}

	}
}