import {
	Logger, logger, DebugSession,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent, InvalidatedEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from "@vscode/debugadapter";

import * as vscode from "vscode";
import { DebugProtocol } from "@vscode/debugprotocol";
import { Socket } from "net";
import { config } from "process";
import { LSPUtils } from "./LSPUtils";
import { spawn } from "child_process";

const Port = 141414;

type Commands = "registers";

interface SocketMessage {
	messageId: number;
	command: Commands;
	data: any;
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

	// debugUtils = new DebugUtils();
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

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments, request?: DebugProtocol.Request | undefined): void {
		const luaPath = this.context.asAbsolutePath("EmulatorLink/Mesen.lua");
		const program = spawn(
			this.config.emuPath,
			[this.config.romPath, luaPath]
		)
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request | undefined): void {

	}
}
//#endregion Debug的Session

class DebugUtils {

	private socket: Socket
	private socketOption = {
		isConnected: false
	}
	private messagePorts: ((response: any) => void)[] = [];

	constructor() {
		this.socket = new Socket();
		this.socket.on("connect", () => {
			this.socketOption.isConnected = true;
			console.log("connected");
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
			console.log('ready');
		});

		this.socket.on("data", (data: Buffer) => {
			console.log(data);
		});
	}

	OpenConnect() {
		this.socket.connect(Port, "127.0.0.1");
	}

	async GetRegisters() {
		let data = await this.SendMessage("registers");
		console.log(data);
	}

	private SendMessage(command: Commands, data?: any): Promise<SocketMessage> {
		const messageId = Math.random();
		return new Promise((resolve, reject) => {
			const message = { messageId, command, data };
			this.socket.write(JSON.stringify(message));
			this.messagePorts[messageId] = (response: any) => {
				resolve(response.data);
			};
		});
	}

	private ReceiveMessage(message: SocketMessage) {
		const data: SocketMessage = message;
		if (data.messageId === undefined) {
			return;
		}

		if (!this.messagePorts[data.messageId])
			return;

		this.messagePorts[data.messageId].call(this, data);
		delete (this.messagePorts[data.messageId]);
	}
}