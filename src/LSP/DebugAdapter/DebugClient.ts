import { Socket } from "net";

const DiffFileName = "zgasm-diff";

interface MsgDataType<T, K> {
	send: T;
	receive: K;
	waiting: boolean;
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
	ReceiveData?: (data: Uint8Array) => void;
	ClientCloseEvent?: () => void;

	connectType: ConnectStatue = "tryConnect";
	private option = { host: "127.0.0.1", port: 4065, timeOut: 1, retryTimes: 10 };
	private socket: Socket;
	private textEncoder = new TextEncoder();
	private textDecoder = new TextDecoder();
	private buffer: Buffer = Buffer.from([]);

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
		this.socket.on("data", (chunk) => {
			// 追加新数据
			this.buffer = Buffer.concat([this.buffer, chunk]);

			// 循环处理所有完整消息
			while (this.buffer.length >= 4) {
				const msgLength = this.buffer.readUInt32LE(0); // 读取长度（小端）
				const totalLength = 4 + msgLength;

				// 数据还不够，等待更多
				if (this.buffer.length < totalLength)
					break; 

				// 提取消息体（去掉长度前缀）
				const messageBuffer = this.buffer.subarray(4, totalLength);
				// 转换为 Uint8Array 传给 ReceiveData（可选）
				const messageArray = new Uint8Array(messageBuffer);
				this.ReceiveData?.(messageArray);

				// 移除已处理的数据
				this.buffer = this.buffer.subarray(totalLength);
			}
		});
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
		const json = JSON.stringify(data);
		const body = Buffer.from(json, 'utf8');
		const packet = Buffer.alloc(4 + body.length);
		packet.writeUInt32LE(body.length, 0);
		body.copy(packet, 4);
		this.socket.write(packet);
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
