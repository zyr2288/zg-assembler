import * as vscode from "vscode";
import { BreakpointEvent, LoggingDebugSession, Response, ProgressEndEvent, InitializedEvent, TerminatedEvent, StoppedEvent, Thread, Source } from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";
import { LSPUtils } from "../LSPUtils";
import { ZGAssConfig, ZGAssProgressStartEvent } from "./ZGAssInterface";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { DebugUtils } from "./DebugUtils";

const ThreadID = 1;

export class ZGAssDebugSession extends LoggingDebugSession {

	private config: ZGAssConfig;
	private context: vscode.ExtensionContext;
	private debugUtils: DebugUtils;
	/**分别是，key fileHash， set 为行号 */
	private breakPointMap = new Map<number, Set<number>>();
	private hitBreakPoint?: DebugProtocol.StackFrame;

	// 绑定的模拟器进程
	private program: ChildProcessWithoutNullStreams | undefined;
	private debugHelper = LSPUtils.assembler.languageHelper.debugHelper;


	constructor(context: vscode.ExtensionContext, session: vscode.DebugSession) {
		super();

		// this.setDebuggerLinesStartAt1(false);
		// this.setDebuggerColumnsStartAt1(false);

		this.config = session.configuration as ZGAssConfig;
		this.context = context;
		this.debugUtils = new DebugUtils();

		// this.runtime.on("setBreakPoint", () => {
		// 	this.sendEvent(new BreakpointEvent("changed", { verified: true }));
		// });

		this.debugUtils.BindingEvent("socket-close", () => {
			this.CloseEmulator();
		});

		this.debugUtils.BindingEvent("break", this.HitBreakPoint.bind(this));
	}

	//#region 初始化启动Debug的请求
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

		response.body = response.body || {};
		// response.body.supportsBreakpointLocationsRequest = true;
		this.sendResponse(response);
	}
	//#endregion 初始化启动Debug的请求

	//#region Debug进程启动
	protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments, request?: DebugProtocol.Request) {
		this.ProgramInit(response);
	}

	protected attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments, request?: DebugProtocol.Request) {
		this.ProgramInit(response);
	}
	//#endregion Debug进程启动

	//#region 设定断点
	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request | undefined) {
		if (!args.source.path || !args.breakpoints)
			return;

		const filePath = LSPUtils.assembler.fileUtils.ArrangePath(args.source.path);
		const hash = LSPUtils.assembler.utils.getHashcode(filePath);
		const lineSets = this.breakPointMap.get(hash) ?? new Set<number>();

		const remain = new Set<number>();
		const newLine = new Set<number>();

		let resultBreakPoint: DebugProtocol.Breakpoint[] = [];
		for (let i = 0; i < args.breakpoints.length; i++) {
			// 这里对应的行为编辑器行数 - 1
			const line = args.breakpoints[i].line - 1;

			const fileName = await LSPUtils.assembler.fileUtils.GetFileName(filePath);
			const source = new Source(fileName, filePath);

			if (lineSets.has(line)) {
				remain.add(line);
				lineSets.delete(line);
			} else {
				const id = LSPUtils.assembler.utils.getHashcode(filePath, line);
				const result = this.debugHelper.DebugSet(filePath, line);
				if (result === undefined) {
					resultBreakPoint.push({ id, line: line + 1, verified: false, source });
					continue;
				}

				resultBreakPoint.push({ id, line: line + 1, verified: true, source });
				this.debugUtils.BreakPointSet(result.orgAddress, result.baseAddress);
				newLine.add(line);
			}
		}

		newLine.forEach((value) => {
			remain.add(value);
		});

		lineSets.forEach((value) => {
			const result = this.debugHelper.DebugRemove(args.source.path!, value);
			if (result === undefined)
				return;

			this.debugUtils.BreakPointRemove(result.orgAddress, result.baseAddress);
		});

		this.breakPointMap.set(hash, remain);
		if (resultBreakPoint.length !== 0) {
			response.body = { breakpoints: resultBreakPoint };
			console.log("add break point", resultBreakPoint);
		}

		this.sendResponse(response);
	}
	//#endregion 设定断点


	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {
		if (!this.hitBreakPoint)
			return;

		response.body = {
			stackFrames: [this.hitBreakPoint],
			totalFrames: 1
		};
		this.hitBreakPoint = undefined;
		this.sendResponse(response);
	}

	private HitBreakPoint(data: number) {
		const line = this.debugHelper.allDebugLines.base.get(data);
		if (!line)
			return;

		const hash = LSPUtils.assembler.utils.getHashcode(line.orgText.fileHash, line.orgText.line);
		this.hitBreakPoint = { id: hash, line: line.orgText.line, name: "PRG-ROM", column: 0 };
		this.sendEvent(new StoppedEvent("breakpoint", ThreadID));
	}

	//#region 关闭Debug进程
	protected terminateRequest(response: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments, request?: DebugProtocol.Request | undefined): void {
		this.CloseEmulator();
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request | undefined): void {
		this.CloseEmulator();
	}
	//#endregion 关闭Debug进程


	//#region 必要的方法
	/**必要的方法 */
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request) {
		this.sendResponse(response);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request | undefined): void {
		response.body = {
			threads: [new Thread(ThreadID, "thread 1")]
		};
		this.sendResponse(response);
	}
	//#endregion 必要的方法

	/***** private *****/

	//#region 程序初始化
	/**程序初始化 */
	private async ProgramInit(response: Response) {
		const luaPath = this.context.asAbsolutePath("EmulatorLink/Mesen.lua");
		this.program = spawn(
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

	//#region 关闭模拟器进程
	private CloseEmulator() {
		this.program?.kill();
		this.sendEvent(new TerminatedEvent());
	}
	//#endregion 关闭模拟器进程

}