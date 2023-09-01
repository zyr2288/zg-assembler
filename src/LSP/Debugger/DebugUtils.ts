import { Socket } from "net";
import { LSPUtils } from "../LSPUtils";

type Commands = "registers" | "memory";

interface SocketMessage {
	messageId: number;
	command: Commands;
	data?: any;
}

export class DebugUtils {
	socketOption = {
		isConnected: false
	}
	private socket: Socket;
	private messagePorts: ((response: any) => void)[] = [];

	constructor() {
		this.socket = new Socket();

		this.socket.on("data", (data: Uint8Array) => {
			let text = LSPUtils.assembler.fileUtils.BytesToString(data);
			let args = text.split(/\s+/g, 2);
			this.ReceiveMessage({ messageId: parseFloat(args[0]), command: args[1] as Commands, data: args[2] });
		});
	}

	Connect(host: string, port: number): Promise<void> {
		return new Promise((resolve, reject) => {
			this.socket.on("ready", () => {
				console.log("connect ready");
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

	private ReceiveMessage(message: SocketMessage) {
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