import EventEmitter = require("events");
import { LSPUtils } from "../LSPUtils";

export interface IRuntimeBreakpoint {
	path: string;
	line: number;
	verified: boolean;
}

export class ZGAssDebugRuntime extends EventEmitter {
	SetBreakPoint(path: string, line: number) {
		path = LSPUtils.assembler.fileUtils.ArrangePath(path);
		return { path, line };
	}
}