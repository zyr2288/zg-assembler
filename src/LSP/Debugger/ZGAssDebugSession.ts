import * as vscode from "vscode";
import { BreakpointEvent, LoggingDebugSession, Response, ProgressEndEvent, InitializedEvent } from "@vscode/debugadapter";
import { ZGAssDebugRuntime } from "./ZGAssDebugRuntime";
import { DebugProtocol } from "@vscode/debugprotocol";
import { LSPUtils } from "../LSPUtils";
import { ZGAssConfig, ZGAssProgressStartEvent } from "./ZGAssInterface";
import { spawn } from "child_process";
import { DebugUtils } from "./DebugUtils";

export class ZGAssDebugSession extends LoggingDebugSession {

	private runtime: ZGAssDebugRuntime;
	private config: ZGAssConfig;
	private context: vscode.ExtensionContext;
	private debugUtils: DebugUtils;
	private breakPointMap = new Map<number, Set<number>>();

	constructor(context: vscode.ExtensionContext, session: vscode.DebugSession) {
		super();

		this.runtime = new ZGAssDebugRuntime();
		this.config = session.configuration as ZGAssConfig;
		this.context = context;
		this.debugUtils = new DebugUtils();

		// this.runtime.on("setBreakPoint", () => {
		// 	this.sendEvent(new BreakpointEvent("changed", { verified: true }));
		// });
	}

	/**初始化启动Debug的请求 */
	protected async initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): Promise<void> {
		let emu = await LSPUtils.assembler.fileUtils.PathType(this.config.emuPath);
		if (emu !== "file") {
			this.sendErrorResponse(response, {
				id: 1001,
				format: LSPUtils.assembler.localization.GetMessage("Cannot find program path {0}", this.config.emuPath)
			});
			return;
		}

		let rom = await LSPUtils.assembler.fileUtils.PathType(this.config.romPath);
		if (rom !== "file") {
			this.sendErrorResponse(response, {
				id: 1001,
				format: LSPUtils.assembler.localization.GetMessage("Cannot find rom file {0}", this.config.romPath)
			});
			return;
		}

		if (LSPUtils.assembler.languageHelper.debugHelper.allDebugLines.base.size === 0) {
			this.sendErrorResponse(response, {
				id: 1001,
				format: LSPUtils.assembler.localization.GetMessage("Please compile the file before Debug")
			});
			return;
		}

		this.sendResponse(response);
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments, request?: DebugProtocol.Request): void {
		this.ProgramInit(response);
	}

	protected attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments, request?: DebugProtocol.Request): void {
		this.ProgramInit(response);
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request | undefined): void {
		if (!args.source.path || !args.breakpoints)
			return;

		const hash = LSPUtils.assembler.utils.getHashcode(args.source.path);
		const lineSets = this.breakPointMap.get(hash) ?? new Set<number>();

		const remain = new Set<number>();
		const newLine = new Set<number>();
		const indexConfident: boolean[] = [];

		for (let i = 0; i < args.breakpoints.length; i++) {
			const brk = args.breakpoints[i];
			if (indexConfident[i] = lineSets.has(brk.line)) {
				remain.add(brk.line);
				lineSets.delete(brk.line);
			} else {
				newLine.add(brk.line);
			}
		}


		LSPUtils.assembler.languageHelper.debugHelper.DebugSet
	}

	/***** private *****/

	//#region 程序初始化
	/**程序初始化 */
	private async ProgramInit(response: Response) {
		const luaPath = this.context.asAbsolutePath("EmulatorLink/Mesen.lua");
		const program = spawn(
			this.config.emuPath,
			[this.config.romPath, luaPath]
		);

		const progressStart = new ZGAssProgressStartEvent("launching", "Connecting to debugger...", undefined, 0);
		this.sendEvent(progressStart);

		const retryLimit = 5;
		let retry = 0;

		while (retry++ < retryLimit) {
			await this.debugUtils.Waiting(2 * 1000);
			if (this.debugUtils.socketOption.isConnected)
				break;

			try {
				await this.debugUtils.Connect(this.config.host, this.config.port);
				break;
			} catch (error) {
				console.error(error);
			}
		}
		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
		this.sendEvent(new ProgressEndEvent("launching"));
	}
	//#endregion 程序初始化

}