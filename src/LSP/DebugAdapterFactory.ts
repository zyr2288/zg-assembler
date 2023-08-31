import {
	Logger, logger, DebugSession,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent, InvalidatedEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint, Event
} from "@vscode/debugadapter";

import * as vscode from "vscode";
import { DebugProtocol } from "@vscode/debugprotocol";
import { Socket } from "net";
import { LSPUtils } from "./LSPUtils";
import { spawn } from "child_process";

type Commands = "registers" | "memory";

interface SocketMessage {
	messageId: number;
	command: Commands;
	data?: (number | string)[];
}

interface DebugConfig extends vscode.DebugConfiguration {
	emuPath: string;
	romPath: string;
	host: string;
	port: number;
}

//#region Debug适配器接口
export class ZGAssemblerDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {

	private readonly context: vscode.ExtensionContext;

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.debug.registerDebugConfigurationProvider(
				LSPUtils.assembler.config.DebugConfig.DebugType,
				new ZGAssemblerDebugConfigurationProvider()
			)
		);

		context.subscriptions.push(
			vscode.debug.registerDebugAdapterDescriptorFactory(
				LSPUtils.assembler.config.DebugConfig.DebugType,
				new ZGAssemblerDebugAdapterFactory(context)
			)
		);
	}

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new ZGAssemblerDebugSession(this.context, _session));
	}
}
//#endregion Debug适配器接口

//#region Debug配置
export class ZGAssemblerDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
	resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken | undefined): vscode.ProviderResult<vscode.DebugConfiguration> {
		if (!config.type && !config.name) {
			const msg = LSPUtils.assembler.localization.GetMessage("Cannot find launch.json");
			return vscode.window.showInformationMessage(msg).then(_config => {
				return undefined;
			});
		}

		if (!config.emuPath) {
			const msg = LSPUtils.assembler.localization.GetMessage("Cannot find program path {0}");
			return vscode.window.showInformationMessage(msg).then(_config => {
				return undefined;
			});
		}

		if (!config.romPath) {
			const msg = LSPUtils.assembler.localization.GetMessage("Cannot find rom file {0}");
			return vscode.window.showInformationMessage(msg).then(_config => {
				return undefined;
			});
		}

		config.host = LSPUtils.assembler.config.DebugConfig.DebugHost;
		config.port = LSPUtils.assembler.config.DebugConfig.DebugPort;
		return config;
	}
}
//#endregion Debug配置

//#region Debug的Session
class ZGAssemblerDebugSession extends DebugSession {

	debugUtils = new DebugUtils();
	config: DebugConfig;
	context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext, _session: vscode.DebugSession) {
		super();
		this.context = context;
		this.config = _session.configuration as DebugConfig;
	}

	// handleMessage(msg: DebugProtocol.ProtocolMessage): void {
	// 	msg.success
	// }

	// handleMessage(msg: DebugProtocol.ProtocolMessage): void {
	// 	console.log("Debug Protocol", msg);
	// }

	/**初始化请求，请勿修改名称 */
	protected async initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments) {
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

		console.log(response);
		console.log(args);
		this.sendResponse(response);
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments, request?: DebugProtocol.Request) {
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

			this.debugUtils.OpenConnect(this.config.host, this.config.port);
		}

		await this.debugUtils.Waiting(2 * 1000);
		await this.debugUtils.GetRegisters();
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): void {

	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request | undefined): void {
		
	}
}
//#endregion Debug的Session

class DebugUtils {

	socketOption = {
		isConnected: false
	}
	private socket: Socket
	private messagePorts: ((response: any) => void)[] = [];

	constructor() {
		this.socket = new Socket();
		this.socket.on("connect", () => {
			this.socketOption.isConnected = true;
		});

		this.socket.on('error', (err: Error) => {
			console.log(err);
		});

		this.socket.on('end', () => {
			this.socketOption.isConnected = false;
			console.log('end');
			// this.events.emit('exit');
		});

		this.socket.on('close', () => {
			this.socketOption.isConnected = false;
			console.log('close');
			// this.events.emit('exit');
		});

		this.socket.on('ready', () => {
		
		});

		this.socket.on("data", (buf: ArrayBuffer) => {
			let buffer = new Uint8Array(buf);
			let text = LSPUtils.assembler.fileUtils.BytesToString(buffer);
			const index = text.indexOf(" ");
			const messageId = parseFloat(text.substring(0, index));
			const data = JSON.parse(text.substring(index + 1));
			this.ReceiveMessage({ messageId, data })
		});
	}

	OpenConnect(host: string, port: number) {
		this.socket.connect(port, host);
	}

	async GetRegisters() {
		let data = await this.SendMessage("registers");
		console.log(data);
	}

	Waiting(millisecond: number): Promise<void> {
		return new Promise((resolve, reject) => {
			setTimeout(() => { resolve(); }, millisecond);
		});
	}

	private SendMessage(command: Commands, data?: any): Promise<SocketMessage> {
		const messageId = Math.random();
		return new Promise((resolve, reject) => {
			const message = { messageId, command, data };
			this.socket.write(this.ProcessMessage(message));
			this.messagePorts[messageId] = (response: any) => {
				resolve(response.data);
			};
		});
	}

	private ReceiveMessage(message: Omit<SocketMessage, "command">) {
		if (message.messageId === undefined) {
			return;
		}

		if (!this.messagePorts[message.messageId])
			return;

		this.messagePorts[message.messageId].call(this, message);
		delete (this.messagePorts[message.messageId]);
	}

	private ProcessMessage(data: SocketMessage) {
		return `${data.messageId} ${data.command} ${data.data}\n`
	}
}

class ZGAssProgressStartEvent extends Event implements DebugProtocol.ProgressStartEvent {
	body: {
		progressId: string;
		title: string;
		message?: string;
		percentage?: number;
	};
	constructor(progressId: string, title: string, message?: string, percentage?: number) {
		super('progressStart');
		this.body = {
			progressId, title, message, percentage,
		};
	}
}