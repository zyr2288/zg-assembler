import { Socket } from "net";
import { LSPUtils } from "../LSPUtils";
import EventEmitter = require("events");

type Commands = "registers" | "memory" | "set-break" | "remove-break";

interface SocketMessage {
	messageId: number;
	command: Commands;
	data?: any;
}

export type ZGAssEvent = "socket-close" | "break";

export class DebugUtils {

	socketOption = {
		isConnected: false
	}

	private socket: Socket;
	private eventEmitter = new EventEmitter();
	private messagePorts: ((response: any) => void)[] = [];

	constructor() {
		this.socket = new Socket();

		this.socket.on("close", (error) => {
			this.eventEmitter.emit("socket-close");
		});

		this.socket.on("data", (data: Uint8Array) => {
			let text = LSPUtils.assembler.fileUtils.BytesToString(data);
			let args = text.split(/\s+/g, 3);
			if (args[0] === "undefined")
				args[0] = undefined as any;

			this.ReceiveMessage({ messageId: args[0] as any, command: args[1] as Commands, data: args[2] });
		});
	}

	BindingEvent(event: ZGAssEvent, callback: (data: any) => void) {
		this.eventEmitter.on(event, callback);
	}

	Connect(host: string, port: number): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.socketOption.isConnected) {
				reject("already connected");
				return;
			}

			this.socket.on("ready", () => {
				console.log("connect ready");
				this.socketOption.isConnected = true;
				resolve();
			});
			this.socket.on("error", (err) => { reject(err); });
			this.socket.connect(port, host);
		});
	}

	Waiting(millisecond: number): Promise<void> {
		return new Promise((resolve, reject) => {
			setTimeout(() => { resolve(); }, millisecond);
		});
	}

	SendMessage(command: Commands, data?: any): Promise<SocketMessage> {
		const messageId = Math.random();
		return new Promise((resolve, reject) => {
			const message = { messageId, command, data };
			this.socket.write(this.ProcessMessage(message));
			this.messagePorts[messageId] = (response: any) => {
				resolve(response.data);
			};
		});
	}

	BreakPointSet(orgAddress: number, baseAddress: number) {
		this.SendMessage("set-break", `${orgAddress},${baseAddress}`);
	}

	BreakPointRemove(orgAddress: number, baseAddress: number) {
		this.SendMessage("remove-break", `${orgAddress},${baseAddress}`);
	}

	private ReceiveMessage(message: SocketMessage) {
		if (message.messageId === undefined) {
			this.ReceiveSpMessage(message);
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

	private ReceiveSpMessage(message: SocketMessage) {
		switch (message.command as ZGAssEvent) {
			case "break":
				/**命中的 romAddress */
				const breakData = parseInt(message.data) + 0x10;
				this.eventEmitter.emit("break", breakData);
				break;
		}
	}
}