import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent, InvalidatedEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint, MemoryEvent
} from "@vscode/debugadapter";

import * as vscode from "vscode";
import { DebugAdapter } from "../Core/LanguageHelper/DebugAdapter";
import { DebugProtocol } from "@vscode/debugprotocol";
import { Socket } from "net";

const Port = 141414;

type Commands = "registers";

interface SocketMessage {
	messageId: number;
	command: Commands;
	data: any;
}

export class DebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {

	static Initialize() {
		vscode.debug.registerDebugConfigurationProvider("zg-assembly-debug", {
			provideDebugConfigurations(folder: vscode.WorkspaceFolder) {
				return [
					{
						name: "Launch Debugger",
						request: "launch",
						type: "zg-assembly-debug",
						program: "hahah"
					}
				];
			}
		});

		const test = new DebugAdapterFactory();
		vscode.debug.registerDebugAdapterDescriptorFactory("zg-assembly-debug", test);
	}

	createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new DebugSession());
	}
}

class DebugSession extends LoggingDebugSession {
	debugUtils = new DebugUtils();

	handleMessage(msg: DebugProtocol.ProtocolMessage): void {
		console.log(msg);
	}
}

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
			this.socket.write(JSON.stringify({ messageId, command, data }));
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