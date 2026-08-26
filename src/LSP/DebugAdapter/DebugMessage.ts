import * as vscode from "vscode";
import { DebugSession, TerminatedEvent, StackFrame, StoppedEvent, Source, InitializedEvent, Thread, Breakpoint, ContinuedEvent } from "@vscode/debugadapter";
import { LSPUtils } from "../LSPUtils";
import { ConnectStatue, ConnectClient, ConnectType } from "./DebugClient";
import { DebugProtocol } from "@vscode/debugprotocol";

/** 向模拟器发送消息的接口 */
interface DebugMessageRequest {
	jsonRPC: "2.0";
	id?: string;
	method: keyof DebugMsgToEmu;
	params?: Record<string, any>;
}

/** 从模拟器接收消息的接口 */
interface DebugMessageReceive {
	jsonRPC: "2.0";
	id?: string;
	result?: any;
	error?: {
		code: number;
		message: string;
	};
}

/** 发送到模拟器消息的格式 */
interface DebugMsgToEmu {
	debugInit: { cpuType: string };
	/**设定断点 */
	breakpointSet: { baseAddress: number, orgAddress: number };
	/**移除断点 */
	breakpointRemove: { baseAddress: number, orgAddress: number };
	pause: undefined;
	resume: undefined;
	stepInto: undefined;
	stepOut: undefined;
	stepOver: undefined;
}

/** 从模拟器接收消息的格式 */
interface DebugMsgFromEmu {
	breakpointHit: { baseAddress: number };
	pause: undefined;
}

export interface ZGAssemblerDebugConfig extends vscode.DebugConfiguration {
	type: "zgassembly";
	request: "attach";
	name: "Debug rom with Emulator",
	host: string;
	port: number;
	romOffset: number;
	cpuType: "Snes" | "Spc" | "NecDsp" | "Sa1" | "Gsu" | "Cx4" | "Gameboy" | "Nes" | "Pce" | "Sms" | "Gba" | "Ws";
}

const SessionThreadID = 1;

export class ZGAssemblerDebugSession extends DebugSession {

	config: ZGAssemblerDebugConfig;

	/** 消息栈，用于存储等待响应的消息处理函数 */
	private messageStack: Record<string, (data: DebugMessageReceive) => void> = {};
	/** 连接客户端，用于与模拟器通信 */
	private client: ConnectClient;

	/** 命中栈，用于存储命中断点的栈帧 */
	private hitStack: StackFrame | undefined;
	private frameStack: number = 1;

	// private textEncoder = new TextEncoder();
	private textDecoder = new TextDecoder();
	private CompileDebug = LSPUtils.assembler.languageHelper.debug;

	/** 调试集合，用于存储调试信息，key1是文件路径，key2是行号 */
	private debugCollection = new Map<string, Map<number, { baseAddr: number, orgAddr: number, verified: boolean }>>();
	private debugOption = { debugBaseLine: 1 };
	private functionMap = new Map<string, Function>();

	constructor(config: vscode.DebugConfiguration) {
		super();

		this.config = config as ZGAssemblerDebugConfig;

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

		this.client = new ConnectClient(this.config);
		this.client.UpdateStatue = this.UpdateStatue.bind(this);
		this.client.ReceiveData = this.MessageReceive.bind(this);
		this.client.ClientCloseEvent = () => {
			this.sendEvent(new TerminatedEvent());
		}

		// 在这里写所有从模拟器接收的消息所映射的函数
		this.functionMap.set("breakpointHit", this.BreakpointHit.bind(this));
		this.functionMap.set("resume", this.EmuResume.bind(this));
		this.functionMap.set("pause", () => {
			this.sendEvent(new StoppedEvent("pause", SessionThreadID));
		});
	}

	/***** 消息处理 *****/

	//#region 接收消息
	/**
	 * 接收消息
	 * @param data 接收的消息
	 * @returns 
	 */
	private MessageReceive(data: Uint8Array) {
		let json = this.textDecoder.decode(data);
		let receiveMsg: DebugMessageReceive | DebugMessageRequest = JSON.parse(json);

		if ("method" in receiveMsg) {
			const func = this.functionMap.get(receiveMsg.method);
			if (func) {
				let temp = { jsonRPC: "2.0", id: receiveMsg.id, result: func(receiveMsg.params) } as DebugMessageReceive;
				if (temp.id)
					this.MessageSend(temp);

			} else {
				const error = LSPUtils.assembler.localization.GetMessage("Debug error", `Method ${receiveMsg.method} not found`);
				LSPUtils.assembler.fileUtils.ShowMessage(error);
			}
			return;
		}

		if (receiveMsg.error) {
			const error = LSPUtils.assembler.localization.GetMessage("Debug error", `${receiveMsg.error.code}, ${receiveMsg.error.message}`)
			LSPUtils.assembler.fileUtils.ShowMessage(error);
			return;
		}
		this.messageStack[receiveMsg.id!]!(receiveMsg);
	}
	//#endregion 接收消息

	//#region 发送消息
	/**
	 * 发送消息
	 * @param request 请求消息
	 * @returns 响应消息
	 */
	private MessageSend(request: DebugMessageRequest | DebugMessageReceive): Promise<any> {
		return new Promise((resolve, reject) => {
			this.client.SendMessage(request);
			if (!request.id) {
				resolve(undefined);
				return;
			}

			// 如果发送的有Id号，则等待响应
			this.messageStack[request.id] = (data) => {
				resolve(data.result);
				delete (this.messageStack[request.id!]);
			}
		});
	}
	//#endregion 发送消息

	//#region 更新连接状态
	/**
	 * 更新连接状态
	 * @param type 连接状态
	 * @param data 连接状态数据
	 */
	private async UpdateStatue<T extends keyof ConnectType>(type: ConnectStatue, data: ConnectType[T]) {
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
	//#endregion 更新连接状态

	/***** vscode 插件Debug原消息处理方法 */

	//#region 插件初始化
	/**插件初始化 */
	protected async initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments) {

		if (process.env.ZGAssembler_TestDebugAdapter === "true") {
			response.body = response.body || {};
			this.sendResponse(response);
			this.sendEvent(new InitializedEvent());
			return;
		}

		// 如果没有编译文件，则停止调试
		if (!LSPUtils.assembler.compiler.enviroment.compileResult.finished) {
			const error = LSPUtils.assembler.localization.GetMessage("Please compile the file before Debug");
			LSPUtils.ShowMessageBox(error, "error");
			this.sendEvent(new TerminatedEvent());
			return;
		}

		if (!await this.client.Connect())
			return;

		const requestToEmu: DebugMessageRequest = { jsonRPC: "2.0", method: "debugInit", params: { cpuType: this.config.cpuType } };
		this.MessageSend(requestToEmu);

		response.body = response.body || {};
		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}
	//#endregion 插件初始化

	//#region 设定断点请求
	/**
	 * 设定断点请求
	 * @param response 响应消息
	 * @param args 请求参数
	 * @param request 请求消息
	 */
	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request): void {
		if (process.env.ZGAssembler_TestDebugAdapter === "true") {
			response.body = { breakpoints: [] };
			this.sendResponse(response);
			return;
		}

		response.body = { breakpoints: [] };
		if (args.source.path && args.breakpoints) {
			const lineNumbers = args.breakpoints.map(v => v.line);
			const breaks = this.BreakpointsAnalyse(args.source.path, this.config.romOffset, lineNumbers);
			for (let i = 0; i < breaks.length; i++) {
				const bp = breaks[i];
				const newBp = new Breakpoint(bp.verified, bp.line);
				response.body.breakpoints.push(newBp);
			}
		}

		this.sendResponse(response);
	}
	//#endregion 设定断点请求

	//#region 暂停请求
	protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request): void {
		let message: DebugMessageRequest = { jsonRPC: "2.0", method: "pause" };
		this.MessageSend(message);
		this.sendResponse(response);
	}
	//#endregion 暂停请求

	//#region 继续/恢复请求
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request): void {
		let message: DebugMessageRequest = { jsonRPC: "2.0", method: "resume" };
		this.MessageSend(message);
		this.sendResponse(response);
	}
	//#endregion 继续/恢复请求

	//#region 单步请求
	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): void {
		let message: DebugMessageRequest = { jsonRPC: "2.0", method: "stepInto" };
		this.MessageSend(message);
		this.sendResponse(response);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): void {
		let message: DebugMessageRequest = { jsonRPC: "2.0", method: "stepOut" };
		this.MessageSend(message);
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request): void {
		let message: DebugMessageRequest = { jsonRPC: "2.0", method: "stepOver" };
		this.MessageSend(message);
		this.sendResponse(response);
	}
	//#endregion 单步请求

	//#region 终止 请求
	protected terminateRequest(response: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments, request?: DebugProtocol.Request): void {
		this.client.Close();
		this.sendResponse(response);
	}
	//#endregion 终止 请求

	//#region 断开连接
	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
		this.client.Close();
		this.sendResponse(response);
	}
	//#endregion 断开连接

	/***** 勿动以下方法 *****/

	//#region 附加进程请求
	/**附加进程请求 */
	protected async attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments, request?: DebugProtocol.Request) {
		if (process.env.ZGAssembler_TestDebugAdapter === "true") {
			// 执行初始化
			this.sendResponse(response);
			this.sendEvent(new InitializedEvent());
			return;
		}

		if (this.client.connectType !== "connected") {
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

	//#region 线程追踪，勿动
	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {
		if (!this.hitStack) {
			response.body = { stackFrames: [] };
			this.sendResponse(response);
			return;
		}

		response.body = { stackFrames: [this.hitStack] };
		this.sendResponse(response);
		this.hitStack = undefined;
	}
	//#endregion 线程追踪，勿动

	//#region 获取寄存器信息
	// protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request) {
	// 	response.body = {
	// 		scopes: [new Scope("Registers", SessionThreadID, false)]
	// 	};
	// 	this.sendResponse(response);
	// }

	// protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request) {
	// 	switch (args.variablesReference) {
	// 		case 1:
	// 			const registers = await this.debugClient.RegistersGet();
	// 			const vars: Variable[] = [];
	// 			for (const key in registers)
	// 				vars.push({ name: key, value: registers[key].toString(16), variablesReference: 1 });

	// 			response.body = { variables: vars };
	// 			break;
	// 	}
	// 	this.sendResponse(response);
	// }
	//#endregion 获取寄存器信息

	/***** 自定义消息处理 *****/

	private CreateId() {
		return Math.random().toString(36).substring(8);
	}

	//#region 模拟器命中某个断点消息处理
	private BreakpointHit(data: { baseAddress: number }) {
		const temp = data.baseAddress + this.config.romOffset;
		const line = this.CompileDebug.GetDebugLine(temp);
		if (!line) {
			this.hitStack = new StackFrame(SessionThreadID, "line");
			this.sendEvent(new StoppedEvent("pause", SessionThreadID));
			return;
		}
		const source = new Source("D:\\ProgramTest\\ZGAssembler-Test\\BattleCity\\main.asm", "D:\\ProgramTest\\ZGAssembler-Test\\BattleCity\\main.asm");
		this.hitStack = new StackFrame(this.frameStack++, "line", source, 1);
		this.sendEvent(new StoppedEvent("breakpoint", SessionThreadID));
	}
	//#endregion 模拟器命中某个断点消息处理

	//#region 模拟器继续运行的请求
	private EmuResume() {
		this.sendEvent(new ContinuedEvent(SessionThreadID, true));
	}
	//#endregion 模拟器继续运行的请求

	//#region 所有断点进行分析，是设置还是要移除
	/**
	 * 所有断点进行分析，是设置还是要移除
	 * @param filePath 文件路径
	 * @param romOffset 文件基址偏转
	 * @param lineNumbers Debug在第几行
	 * @returns 
	 */
	private BreakpointsAnalyse(filePath: string, romOffset: number, lineNumbers: number[]) {
		const result: { line: number, verified: boolean }[] = [];

		let collection = this.debugCollection.get(filePath);
		if (!collection) {
			collection = new Map();
			this.debugCollection.set(filePath, collection);
		}

		const tempSet = new Set(collection.keys());
		for (let i = 0; i < lineNumbers.length; i++) {
			const lineNumber = lineNumbers[i] - this.debugOption.debugBaseLine;
			const colLine = collection.get(lineNumber);
			if (colLine) {
				tempSet.delete(lineNumber);
				result.push({ line: lineNumber + this.debugOption.debugBaseLine, verified: colLine.verified });
				continue;
			}

			const line = this.CompileDebug.GetDebugLineWithFile(filePath, lineNumber);
			result.push({ line: lineNumber + this.debugOption.debugBaseLine, verified: !!line });
			if (line) {
				collection.set(lineNumber, { baseAddr: line.baseAddress, orgAddr: line.line.lineResult.address.org, verified: !!line });
				const message: DebugMessageRequest = {
					jsonRPC: "2.0", method: "breakpointSet",
					params: { baseAddress: line.baseAddress - romOffset, orgAddress: line.line.lineResult.address.org }
				};
				this.MessageSend(message);
			}
		}

		for (var temp of tempSet) {
			const line = collection.get(temp);
			collection.delete(temp);
			if (!line)
				continue;

			const message: DebugMessageRequest = {
				jsonRPC: "2.0", method: "breakpointRemove",
				params: { baseAddress: line.baseAddr - romOffset, orgAddress: line.orgAddr }
			};
			this.MessageSend(message);
		}

		return result;
	}
	//#endregion 所有断点进行分析，是设置还是要移除

	/***** 测试用 *****/

	HitBreakpoint() {
		const source = new Source("D:\\ProgramTest\\ZGAssembler-Test\\Battle City\\main.asm", "D:\\ProgramTest\\ZGAssembler-Test\\Battle City\\main.asm");
		this.hitStack = new StackFrame(this.frameStack++, "line", source, 1);
		this.sendEvent(new StoppedEvent("breakpoint", SessionThreadID));
	}
}