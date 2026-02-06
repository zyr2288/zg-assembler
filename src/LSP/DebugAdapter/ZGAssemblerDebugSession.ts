import * as vscode from "vscode";
import { DebugSession, StoppedEvent, InitializedEvent, Breakpoint, Thread, StackFrame, Source, TerminatedEvent, Scope, Variable, ContinuedEvent } from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";
import { LSPUtils } from "../LSPUtils";
import { DebugClient } from "./DebugClient";

const SessionThreadID = 1;

export interface ZGAssemblerDebugConfig extends vscode.DebugConfiguration {
	type: "zgassembly";
	request: "attach";
	name: "Debug rom with Emulator",
	host: string;
	port: number;
	romOffset: number;
	cpuType: "Snes" | "Spc" | "NecDsp" | "Sa1" | "Gsu" | "Cx4" | "Gameboy" | "Nes" | "Pce" | "Sms" | "Gba" | "Ws";
}

export class ZGAssemblerDebugSession extends DebugSession {

	debugClient: DebugClient;
	config: ZGAssemblerDebugConfig;

	private hitStack: StackFrame | undefined;
	private CompileDebug = LSPUtils.assembler.languageHelper.debug;

	//#region 构造函数，初始化
	constructor(config: vscode.DebugConfiguration) {
		super();

		this.config = config as ZGAssemblerDebugConfig;

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

		this.debugClient = new DebugClient({ host: this.config.host, port: this.config.port, tryReconnect: true });

		this.debugClient.BreakPointHitHandle = async (data: any) => {
			const temp = parseInt(data.baseAddress) + this.config.romOffset;
			const line = this.CompileDebug.GetDebugLine(temp);
			if (!line) {
				this.hitStack = new StackFrame(SessionThreadID, "line");
				this.sendEvent(new StoppedEvent("pause", SessionThreadID));
				return;
			}
			const source = new Source(line.filePath, line.filePath);
			this.hitStack = new StackFrame(SessionThreadID, "line", source, line.lineNumber + 1);
			this.sendEvent(new StoppedEvent("breakpoint", SessionThreadID));
		}

		// 连接后Debug初始化
		this.debugClient.client.OnConnectedHandle = () => {
			const option = { cpuType: this.config.cpuType };
			this.debugClient.client.SendMessage("debug-init", option);
		}

		this.debugClient.EmuResumeHandle = () => {
			this.sendEvent(new ContinuedEvent(SessionThreadID, true));
		}

		// 连接信息绑定
		this.debugClient.client.ConnectMessageHandle = async (type, data) => {
			let msg = "";
			switch (type) {
				case "tryConnect":
					msg = LSPUtils.assembler.localization.GetMessage("Connect to emulator...{0}", data as number);
					break;
				case "tryConnectFail":
					msg = LSPUtils.assembler.localization.GetMessage("Debugger can not connect to the emulator");
					this.sendEvent(new TerminatedEvent());
					break;
				case "connected":
					msg = LSPUtils.assembler.localization.GetMessage("Connected emulator");
					break;
			}
			LSPUtils.StatueBarShowText(msg);
		}

	}
	//#endregion 构造函数，初始化

	//#region 插件初始化
	/**插件初始化 */
	protected async initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments) {

		// 如果没有编译文件，则停止调试
		if (!LSPUtils.assembler.compiler.enviroment.compileResult.finished) {
			const error = LSPUtils.assembler.localization.GetMessage("Please compile the file before Debug");
			LSPUtils.ShowMessageBox(error, "error");
			this.sendEvent(new TerminatedEvent());
			return;
		}

		if (!await this.debugClient.client.Connect())
			return;

		response.body = response.body || {};

		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}
	//#endregion 插件初始化

	//#region 设定断点请求
	/**设定断点请求 */
	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request) {

		await this.debugClient.WaitForGameLoaded();

		// 判断设定的断点是否失效
		response.body = { breakpoints: [] };

		if (args.source.path && args.breakpoints) {
			const lineNumbers = args.breakpoints.map(v => v.line);
			const breaks = this.debugClient.BreakpointsAnalyse(args.source.path, this.config.romOffset, lineNumbers);
			for (let i = 0; i < breaks.length; i++) {
				const bp = breaks[i];
				const newBp = new Breakpoint(bp.verified, bp.line);
				response.body.breakpoints.push(newBp);
			}
		}

		this.sendResponse(response);
	}
	//#endregion 设定断点请求

	//#region 附加进程请求
	/**附加进程请求 */
	protected async attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments, request?: DebugProtocol.Request) {

		if (this.debugClient.client.connectType !== "connected") {
			this.sendEvent(new TerminatedEvent());
			return;
		}

		// 执行初始化
		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}
	//#endregion 附加进程请求

	//#region 线程请求，勿动
	protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request): void {
		// session进程，不能移除，移除后无法停止在断点
		response.body = {
			threads: [new Thread(SessionThreadID, "Thread 1")]
		}
		this.sendResponse(response);
	}
	//#endregion 线程请求，勿动

	//#region 获取寄存器信息
	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request) {
		response.body = {
			scopes: [new Scope("Registers", SessionThreadID, false)]
		};
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request) {
		switch (args.variablesReference) {
			case 1:
				const registers = await this.debugClient.RegistersGet();
				const vars: Variable[] = [];
				for (const key in registers)
					vars.push({ name: key, value: registers[key].toString(16), variablesReference: 1 });

				response.body = { variables: vars };
				break;
		}
		this.sendResponse(response);
	}
	//#endregion 获取寄存器信息

	//#region 线程追踪，勿动
	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {

		if (!this.hitStack)
			return;

		response.body = { stackFrames: [this.hitStack] };
		this.sendResponse(response);
		this.hitStack = undefined;
	}
	//#endregion 线程追踪，勿动

	//#region 暂停请求
	protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request): void {
		this.debugClient.Pause();
		this.sendResponse(response);
	}
	//#endregion 暂停请求

	//#region 继续/恢复请求
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request): void {
		this.debugClient.Resume();
		this.sendResponse(response);
	}
	//#endregion 继续/恢复请求

	//#region 单步请求
	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): void {
		this.debugClient.Step("step-into");
		this.sendResponse(response);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): void {
		this.debugClient.Step("step-out");
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request): void {
		this.debugClient.Step("step-over");
		this.sendResponse(response);
	}
	//#endregion 单步请求

	//#region 终止 请求
	protected terminateRequest(response: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments, request?: DebugProtocol.Request): void {
		this.debugClient.client.Close();
		this.sendResponse(response);
	}
	//#endregion 终止 请求

	//#region 断开连接
	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
		this.debugClient.client.Close();
		this.sendResponse(response);
	}
	//#endregion 断开连接

}