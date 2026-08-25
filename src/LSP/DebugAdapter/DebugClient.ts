import { Socket } from "net";

const DiffFileName = "zgasm-diff";

interface MsgDataType<T, K> {
	send: T;
	receive: K;
	waiting: boolean;
}

/**发送或接受的消息 */
interface ReceiveDatas {
	"debug-init": { send: { cpuType: string }, receive: undefined, waiting: false };
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

export type ConnectStatue = "close" | "tryConnect" | "tryConnectFail" | "connected" | "abort";

export interface ConnectType {
	connected: null;
	tryConnect: number;
	tryConnectFail: null;
}

/**
 * 连接客户端用的Socket，只写了简单的发送和接收，具体在外部实现
 * 只要实现两个接口即可
 * 1. UpdateStatue：连接状态更新
 * 2. ReceiveData：接收数据
 */
export class ConnectClient {

	UpdateStatue?: <T extends keyof ConnectType>(type: ConnectStatue, data: ConnectType[T]) => void;
	ReceiveData?: (data: Buffer) => void;
	ClientCloseEvent?: () => void;

	connectType: ConnectStatue = "tryConnect";
	private option = { host: "127.0.0.1", port: 4065, timeOut: 1, retryTimes: 10 };
	private socket: Socket;

	constructor(clientOption?: { host: string, port: number }) {
		if (clientOption)
			Object.assign(this.option, clientOption);

		this.socket = new Socket();

		// 连接成功
		this.socket.on("connect", () => {
			this.connectType = "connected";
			this.UpdateStatue?.("connected", null);
		});

		// 连接关闭
		this.socket.on("close", () => {
			switch (this.connectType) {
				case "abort":
					this.Close();
					break;
				case "connected":
					this.Close();
					break;
			}
		});

		// 接收数据
		this.socket.on("data", (e) => this.ReceiveData?.(e));
	}

	async Connect() {
		this.socket.setTimeout(5 * 1000);
		if (this.option.retryTimes < 1)
			this.option.retryTimes = 1;

		let times = 0;
		this.connectType = "tryConnect";
		while (times < this.option.retryTimes) {
			this.UpdateStatue?.("tryConnect", times + 1);
			this.socket.connect({ host: this.option.host, port: this.option.port });
			await this.Wait(this.option.timeOut);
			switch (this.connectType as ConnectStatue) {
				case "connected":
					this.UpdateStatue?.("connected", null);
					return true;
				case "abort":
					return false;
			}

			times++;
		}

		this.UpdateStatue?.("tryConnectFail", null);
		this.Close();
		return false;
	}

	/**
	 * 将消息转换为JSON字符串并发送
	 * @param data 消息数据
	 */
	SendMessage(data: any) {
		let json = JSON.stringify(data);
		this.socket.write(json, "utf8");
	}

	Close() {
		if (this.connectType === "close")
			return;

		this.ClientCloseEvent?.();
		this.connectType = "close";
		this.socket.destroySoon();
	}

	private async Wait(second: number): Promise<void> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve();
			}, second * 1000);
		});
	}
}
