import * as vscode from "vscode";
import { DebugSession, StoppedEvent, InitializedEvent, Breakpoint, Thread, StackFrame, Source, TerminatedEvent, Scope } from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";
import { LSPUtils } from "../LSPUtils";
import { DebugClient } from "./DebugClient";

const SessionThreadID = 1;

export interface ZGAssemblerDebugConfig {
	type: "zgassembly";
	request: "launch";
	name: "Debug rom with Emulator",
	host: string;
	port: number;
}

export class ZGAssemblerDebugSession extends DebugSession {

	private hitStack: StackFrame | undefined;
	private variables: DebugProtocol.Variable[] = [];
	private debugClient!: DebugClient;
	private CompileDebug = LSPUtils.assembler.languageHelper.debug;
	private config: ZGAssemblerDebugConfig;

	constructor(config: vscode.DebugConfiguration) {
		super();

		this.config = config as ZGAssemblerDebugConfig;

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

		this.debugClient = new DebugClient(this.config.host, this.config.port);

		this.debugClient.BreakPointHit = (data) => {
			// @ts-ignore
			let temp = parseInt(data);
			const line = this.CompileDebug.GetDebugLine(temp);
			if (!line)
				return;

			const source = new Source(line.filePath, line.filePath)
			this.hitStack = new StackFrame(1, "line", source, line.lineNumber + 1);
			this.sendEvent(new StoppedEvent("breakpoint", SessionThreadID));
		}
	}

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments) {

		// 如果没有编译文件，则停止调试
		if (!LSPUtils.assembler.compiler.enviroment.compileResult.finished) {
			const error = LSPUtils.assembler.localization.GetMessage("Please compile the file before Debug");
			LSPUtils.ShowMessageBox(error, "error");
			this.sendEvent(new TerminatedEvent());
			return;
		}

		response.body = response.body || {};

		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request): void {

		// 判断设定的断点是否失效
		response.body = { breakpoints: [] };

		if (args.source.path) {
			if (args.breakpoints && args.breakpoints.length !== 0) {
				for (let i = 0; i < args.breakpoints.length; i++) {
					const bp = args.breakpoints[i];
					const line = this.debugClient.BreakpointSet(args.source.path, bp.line - 1);
					const newBp = new Breakpoint(true, bp.line);

					// 是否通过验证
					newBp.verified = !!line;
					response.body.breakpoints.push(newBp);

				}
			}
		}

		this.sendResponse(response);
	}

	protected attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments, request?: DebugProtocol.Request): void {

		// 执行初始化
		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request): void {
		// session进程，不能移除，移除后无法停止在断点
		response.body = {
			threads: [new Thread(SessionThreadID, "Thread 1")]
		}
		this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request) {
		response.body = {
			scopes: [new Scope("Registers", 1, false)]
		};
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request) {
		if (this.variables.length === 0) {
			this.sendResponse(response);
			return;
		}

		switch (args.variablesReference) {
			case 1:
				response.body = {
					variables: this.variables
				};
				break;
		}
		this.sendResponse(response);
		this.variables = [];
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {

		if (!this.hitStack)
			return;

		response.body = { stackFrames: [this.hitStack] };
		this.sendResponse(response);
		this.hitStack = undefined;
	}
}