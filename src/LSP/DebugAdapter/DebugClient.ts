/**
 * 发送以及接收消息统一格式
 * messageId;command;data
 * 其中：
 * messageId是一个长度为8的数字字符串
 * command是命令，可以看以下type查看命令格式
 * data是以 data1=value,data2=value 的形式进行传输
 */

import { Socket } from "net";
import { LSPUtils } from "../LSPUtils";

const DiffFileName = "zgasm-diff";

interface MsgDataType<T, K> {
	send: T;
	receive: K;
	waiting: boolean;
}

/**发送或接受的消息 */
interface ReceiveDatas {
	"debug-init": { send: { platform: string }, receive: undefined, waiting: false };
	/**设定断点 */
	"breakpoint-set": { send: { baseAddress: number, orgAddress: number }, receive: undefined, waiting: false };
	/**移除断点 */
	"breakpoint-remove": { send: { baseAddress: number, orgAddress: number }, receive: undefined, waiting: false };
	/**命中断点 */
	"breakpoint-hit": { send: { baseAddress: number, orgAddress: number }, receive: undefined, waiting: false };
	/**获取断点 */
	"breakpoint-get": { send: undefined, receive: Record<number, number>, waiting: false };
	/**获取寄存器信息 */
	"registers-get": { send: undefined, receive: Record<string, number>, waiting: true };
	/**暂停 */
	"pause": { send: undefined, receive: undefined, waiting: false };
	/**继续 */
	"resume": { send: undefined, receive: undefined, waiting: false };
	/**单步进入 */
	"step-into": { send: undefined, receive: undefined, waiting: false };
	/**单步出 */
	"step-out": { send: undefined, receive: undefined, waiting: false };
	/**单步跳过 */
	"step-over": { send: undefined, receive: undefined, waiting: false };
	/**重启 */
	"reset": { send: undefined, receive: undefined, waiting: false };
	/**重新载入ROM */
	"reload": { send: undefined, receive: undefined, waiting: false };
	/**热重载 */
	"hot-reload": { send: { path: string }, receive: { success: boolean }, waiting: false };
	/**当前游戏状态 */
	"game-state": { send: undefined, receive: { state: "open" | "close" }, waiting: false };
}

/**连接选项 */
export interface ClientOption {
	/**主机地址 */
	host: string;
	/**端口 */
	port: number;
	/**是否断线重连 */
	tryReconnect?: boolean;
	/**重连次数 */
	tryTimes?: number;
	/**超时时间 */
	timeoutSecond?: number;
	/**编辑器Debug行号基础，默认1 */
	debugBaseLinenumber?: number;
}

export class DebugClient {

	BreakPointHitHandle?: (data: ReceiveDatas["breakpoint-hit"]["receive"]) => Promise<void> | void;
	EmuResumeHandle?: () => Promise<void> | void;

	client: TcpClient;

	private CompileDebug = LSPUtils.assembler.languageHelper.debug;
	private option = { gameState: "close", debugBaseline: 1 };

	/**Debug合集，key1是文件路径，key2是行号 */
	private debugCollection = new Map<string, Map<number, { baseAddr: number, orgAddr: number, verified: boolean }>>();

	constructor(option: ClientOption) {
		this.client = new TcpClient(option);
		this.client.OnMessageHandle = this.OnMessage.bind(this);
	}

	//#region 接收消息
	async OnMessage<T extends keyof ReceiveDatas>(command: T, data: ReceiveDatas[T]["receive"]) {
		switch (command) {
			case "breakpoint-hit":
				await this.BreakPointHitHandle?.(data as ReceiveDatas["breakpoint-hit"]["receive"]);
				break;
			case "game-state":
				this.option.gameState = (data as ReceiveDatas["game-state"]["receive"]).state;
				break;
			case "resume":
				await this.EmuResumeHandle?.();
				break;
		}
	}
	//#endregion 接收消息

	/***** VSCode Debug端与模拟器通信事件 *****/

	//#region 所有断点进行分析，是设置还是要移除
	/**
	 * 所有断点进行分析，是设置还是要移除
	 * @param filePath 文件路径
	 * @param romOffset 文件基址偏转
	 * @param lineNumbers Debug在第几行
	 * @returns 
	 */
	BreakpointsAnalyse(filePath: string, romOffset: number, lineNumbers: number[]) {
		const result: { line: number, verified: boolean }[] = [];

		let collection = this.debugCollection.get(filePath);
		if (!collection) {
			collection = new Map();
			this.debugCollection.set(filePath, collection);
		}

		const tempSet = new Set(collection.keys());
		for (let i = 0; i < lineNumbers.length; i++) {
			const lineNumber = lineNumbers[i] - this.option.debugBaseline;
			const colLine = collection.get(lineNumber);
			if (colLine) {
				tempSet.delete(lineNumber);
				result.push({ line: lineNumber + this.option.debugBaseline, verified: colLine.verified });
				continue;
			}

			const line = this.CompileDebug.GetDebugLineWithFile(filePath, lineNumber);
			result.push({ line: lineNumber + this.option.debugBaseline, verified: !!line });
			if (line) {
				collection.set(lineNumber, { baseAddr: line.baseAddress, orgAddr: line.line.lineResult.address.org, verified: !!line });
				this.client.SendMessage(
					"breakpoint-set",
					{ baseAddress: line.baseAddress - romOffset, orgAddress: line.line.lineResult.address.org }
				);
			}
		}

		for (var temp of tempSet) {
			const line = collection.get(temp);
			collection.delete(temp);
			if (!line)
				continue;

			this.client.SendMessage(
				"breakpoint-remove",
				{ baseAddress: line.baseAddr - romOffset, orgAddress: line.orgAddr }
			);
		}

		return result;
	}
	//#endregion 所有断点进行分析，是设置还是要移除

	//#region 暂停
	Pause() {
		this.client.SendMessage("pause");
	}
	//#endregion 暂停

	//#region 恢复运行
	Resume() {
		this.client.SendMessage("resume");
	}
	//#endregion 恢复运行

	//#region 单步
	Step<T extends keyof ReceiveDatas>(type: T) {
		this.client.SendMessage(type);
	}
	//#endregion 单步

	//#region 获取所有寄存器信息
	async RegistersGet() {
		return await this.client.SendMessageAndWaitBack("registers-get");
	}
	//#endregion 获取所有寄存器信息

	//#region 重新载入ROM
	ReloadRom() {
		this.client.SendMessage("reload");
	}
	//#endregion 重新载入ROM

	//#region 热重载
	async HotReload(rootFolder: string, offset: number) {
		const diff = await this.CompileDebug.GetEntryFile(rootFolder, offset);
		if (!diff || diff.size === 0)
			return;

		let length = 0;
		diff.forEach((v) => {
			length += 8 + v.length;
		});
		const result = new Uint8Array(length);
		const dataView = new DataView(result.buffer);

		let index = 0;
		diff.forEach((value, key) => {
			dataView.setUint32(index, key, true);
			index += 4;
			dataView.setUint32(index, value.length, true);
			index += 4;
			value.forEach(v => {
				dataView.setUint8(index, v);
				index++;
			})
		});

		const filePath = LSPUtils.assembler.fileUtils.Combine(rootFolder, DiffFileName);
		await LSPUtils.assembler.fileUtils.SaveFile(filePath, result);

		const msg = LSPUtils.assembler.localization.GetMessage("Hot Reload Success");
		LSPUtils.StatueBarShowText(msg);
		this.client.SendMessage("hot-reload", { path: filePath });
	}
	//#endregion 热重载

	//#region 等待游戏载入
	/**等待游戏载入 */
	async WaitForGameLoaded(): Promise<void> {
		this.client.SendMessage("game-state");
		return new Promise((resolve, reject) => {
			const thread = setInterval(() => {
				if (this.client.connectType === "close" || this.client.connectType === "abort") {
					reject();
					clearInterval(thread);
					return;
				}

				if (this.option.gameState === "open") {
					resolve();
					clearInterval(thread);
					return;
				}
			}, 500);
		});
	}
	//#endregion 等待游戏载入

	//#region 清空所有Debug
	ClearAll() {
		this.CompileDebug.tempFile = undefined;
	}
	//#endregion 清空所有Debug

}

export type ClientConnectType = "close" | "tryConnect" | "connected" | "abort";

interface ConnectType {
	connected: null;
	tryConnect: number;
	tryConnectFail: null;
}

//#region Tcp客户端
const NotWaitMsgId = "00000000";

class TcpClient {

	OnMessageHandle?: <T extends keyof ReceiveDatas>(command: T, args: ReceiveDatas[T]["receive"]) => void;
	ConnectMessageHandle?: <T extends keyof ConnectType>(type: T, data: ConnectType[T]) => void;
	OnConnectedHandle?: () => void;
	OnCloseHandle?: () => void;

	option = { tryReconnect: false, tryTimes: 10, timeout: 1 };

	private clientSocket: Socket;
	private host: string;
	private port: number;
	private messageStack: Record<string, <T extends keyof ReceiveDatas>(data: ReceiveDatas[T]) => void> = {};
	private _connectType: ClientConnectType = "close";

	constructor(option: ClientOption) {
		this.clientSocket = new Socket();
		this.host = option.host;
		this.port = option.port;

		if (option.tryReconnect !== undefined) this.option.tryReconnect = option.tryReconnect;
		if (option.tryTimes !== undefined) this.option.tryTimes = option.tryTimes;
		if (option.timeoutSecond !== undefined) this.option.timeout = option.timeoutSecond;

		this.clientSocket.on("connect", () => {
			console.log("connect");
			this._connectType = "connected";
		});

		this.clientSocket.on("data", (e) => {
			let data = e.toString();
			console.log(data);
			const temp = this.ReceiveData(data);
			for (const d of temp) {
				if (d.msgId !== NotWaitMsgId && this.messageStack[d.msgId]) {
					// @ts-ignore
					this.messageStack[d.msgId](d.data);
					continue;
				}

				this.OnMessageHandle?.(d.command as keyof ReceiveDatas, d.data);
			}

		});

		this.clientSocket.on("close", async () => {
			switch (this._connectType) {
				case "tryConnect":
					return;
				case "abort":
					console.log("connect close");
					this._connectType = "close";
					this.OnCloseHandle?.();
					return;
				case "connected":
				case "close":
					if (this.option.tryReconnect)
						await this.Connect();

					return;
			}
		});
	}

	get connectType() { return this._connectType; }

	//#region 连接Socket
	/**
	 * 连接 Socket
	 * @returns true为连接上了
	 */
	async Connect() {
		this.clientSocket.setTimeout(5 * 1000);
		if (this.option.tryTimes < 1)
			this.option.tryTimes = 1;

		let times = 0;
		this._connectType = "tryConnect";
		while (times < this.option.tryTimes) {
			this.ConnectMessageHandle?.("tryConnect", times + 1);
			this.clientSocket.connect({ host: this.host, port: this.port });
			await this.Wait(this.option.timeout);
			switch (this._connectType as ClientConnectType) {
				case "connected":
					this.ConnectMessageHandle?.("connected", null);
					this.OnConnectedHandle?.();
					return true;
				case "abort":
					return false;
			}

			times++;
		}

		this.ConnectMessageHandle?.("tryConnectFail", null);
		this.Close();
		return false;
	}
	//#endregion 连接Socket

	Close() {
		this._connectType = "abort";
		this.clientSocket.destroySoon();
	}

	SendMessage<T extends keyof ReceiveDatas>(command: T, data?: ReceiveDatas[T]["send"]) {
		if (this._connectType !== "connected")
			return;

		const temp = NotWaitMsgId + ";" + this.SendDataProcess(command, data);
		this.clientSocket.write(temp);
	}

	async SendMessageAndWaitBack<T extends keyof ReceiveDatas>(command: T, data?: ReceiveDatas[T]): Promise<ReceiveDatas[T]> {
		return new Promise((resolve, reject) => {
			if (this._connectType !== "connected") {
				const error = LSPUtils.assembler.localization.GetMessage("Debugger can not connect to the emulator");
				LSPUtils.ShowMessageBox(error, "error");
				reject(error);
				return;
			}

			let msgId;
			while ((msgId = Math.random()) === 0) { }
			msgId = Math.floor(msgId * 100000000).toString().padStart(8, "0");
			const temp = msgId + ";" + this.SendDataProcess(command, data);
			this.clientSocket.write(temp);
			this.messageStack[msgId] = (response: any) => {
				console.log(response);
				resolve(response);
				delete (this.messageStack[msgId]);
			};
		});
	}

	private async Wait(second: number): Promise<void> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(undefined);
			}, second * 1000);
		});
	}

	protected ReceiveData(dataStr: string) {
		let parts = dataStr.trim().split("\n");
		const result: { msgId: string, command: string, data?: Record<string, any> }[] = [];

		for (const one of parts) {
			const strs = one.split(";");

			const msgId = strs[0];
			const command = strs[1] as keyof ReceiveDatas;

			let data = undefined;
			if (strs.length === 3) {
				const part = strs[2].split(",");
				data = {} as ReceiveDatas[keyof ReceiveDatas];

				for (let i = 0; i < part.length; i++) {
					const temp = part[i].split("=");
					// @ts-ignore
					data[temp[0]] = temp[1];
				}
			}

			result.push({ msgId, command, data });
		}
		return result;
	}

	protected SendDataProcess(command: string, data?: any) {
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
