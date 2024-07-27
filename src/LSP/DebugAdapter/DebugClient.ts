/**
 * 发送以及接收消息统一格式
 * message;command;data
 * 其中：
 * message是一个长度为8的数字字符串
 * command是命令，可以看以下type查看命令格式
 * data是以 data1=value,data2=value 的形式进行传输
 */

import { Socket } from "net";
import { LSPUtils } from "../LSPUtils";

/**接受的消息 */
interface ReceiveDatas {
	/**设定断点 */
	"breakpoint-set": { baseAddress: number };
	/**移除断点 */
	"breakpoint-remove": { baseAddress: number };
	/**命中断点 */
	"breakpoint-hit": { baseAddress: number };
	/**获取寄存器信息 */
	"registers-get": Record<string, number>;
	/**暂停 */
	"pause": undefined;
	/**继续 */
	"resume": undefined;
	/**重启 */
	"reset": undefined;
}

export class DebugClient {

	BreakPointHit?: (data: ReceiveDatas["breakpoint-hit"]) => void;
	private client: TcpClient;
	private CompileDebug = LSPUtils.assembler.languageHelper.debug;

	constructor(host: string, port: number) {
		this.client = new TcpClient({ host, port });

		this.client.OnMessage = (command, data) => {
			switch (command) {
				case "breakpoint-hit":
					this.BreakPointHit?.(data as ReceiveDatas["breakpoint-hit"]);
					break;
			}
		}
	}

	async Connect() {
		let index = 10;
		while(index-- > 0) {
			this.client.Connect();
			await this.client.Wait(1);
		}
	}

	BreakpointSet(filePath: string, lineNumber: number) {
		const line = this.CompileDebug.GetDebugLineWithFile(filePath, lineNumber);
		if (line) {
			this.client.SendMessage("breakpoint-set", { baseAddress: line.baseAddress });
		}

		return line;
	}

	BreakpointRemove(filePath: string, lineNumber: number) {
		const line = this.CompileDebug.GetDebugLineWithFile(filePath, lineNumber);
		if (line) {
			this.client.SendMessage("breakpoint-remove", { baseAddress: line.baseAddress });
		}

		return line;
	}

	async RegistersGet() {
		return await this.client.SendMessageAndWaitBack("registers-get");
	}
}

//#region Tcp客户端
class TcpClient {

	OnMessage?: <T extends keyof ReceiveDatas>(command: T, args: ReceiveDatas[T]) => void;
	OnClose?: () => void;

	private clientSocket: Socket;
	private host: string;
	private port: number;
	private isConnected: boolean = false;
	private messageStack: Record<string, <T extends keyof ReceiveDatas>(data: ReceiveDatas[T]) => void> = {};

	constructor(option: { host: string, port: number }) {
		this.clientSocket = new Socket();
		this.host = option.host;
		this.port = option.port;

		this.clientSocket.on("connect", () => {
			console.log("connect");
			this.isConnected = true;
		});

		this.clientSocket.on("data", (e) => {
			let data = e.toString();
			const temp = this.ReceiveData(data);
			if (temp.msgId !== 0 && this.messageStack[temp.msgId]) {
				this.messageStack[temp.msgId](temp.data);
				return;
			}

			this.OnMessage?.(temp.command as keyof ReceiveDatas, temp.data);
		});

		this.clientSocket.on("close", () => {
			console.log("connect close");
			this.isConnected = false;
			this.OnClose?.();
		});
	}

	Connect() {
		this.clientSocket.setTimeout(10 * 1000);
		this.clientSocket.connect({
			host: "127.0.0.1",
			port: this.port
		});
	}

	SendMessage(command: keyof ReceiveDatas, data: Record<string, any>) {
		if (!this.isConnected) {
			const error = LSPUtils.assembler.localization.GetMessage("Debugger can not connect to the emulator");
			LSPUtils.ShowMessageBox(error, "error");
			return;
		}

		const temp = "00000000;" + this.SendDataProcess(command, data);
		this.clientSocket.write(temp);
	}

	async SendMessageAndWaitBack<T extends keyof ReceiveDatas>(command: T, data?: ReceiveDatas[T]): Promise<ReceiveDatas[T]> {
		return new Promise((resolve, reject) => {
			if (!this.isConnected) {
				const error = LSPUtils.assembler.localization.GetMessage("Debugger can not connect to the emulator");
				LSPUtils.ShowMessageBox(error, "error");
				reject(error);
				return;
			}

			let msgId;
			while ((msgId = Math.random()) === 0) { }
			msgId = Math.floor(msgId).toString().padStart(8, "0");
			const temp = msgId + ";" + this.SendDataProcess(command, data);
			this.clientSocket.write(temp);
			this.messageStack[msgId] = (response: any) => {
				resolve(response);
				delete (this.messageStack[msgId]);
			};
		});
	}

	async Wait(second: number): Promise<void> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(undefined);
			}, second * 1000);
		});
	}

	protected ReceiveData(dataStr: string) {
		let parts = dataStr.split(";");
		const msgId = parseInt(parts[0]);
		const command = parts[1] as keyof ReceiveDatas;
		parts = parts[2].substring(0, parts[2].length - 1).split(",");
		let data = {} as ReceiveDatas[keyof ReceiveDatas];

		for (let i = 0; i < parts.length; i++) {
			const temp = parts[i].split("=");
			// @ts-ignore
			data[temp[0]] = temp[1];
		}

		return { msgId, command, data };
	}

	protected SendDataProcess(command: string, data?: Record<string, any>) {
		let result = command;
		if (!data)
			return result + "\n";

		result += ";";
		for (const key in data)
			result += `${key}=${data[key]},`;

		return result.substring(0, result.length - 1) + "\n";
	}
}
//#endregion Tcp客户端
