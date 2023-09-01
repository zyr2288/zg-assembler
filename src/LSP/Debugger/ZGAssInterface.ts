import * as vscode from "vscode";
import { Event } from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";

export interface ZGAssConfig extends vscode.DebugConfiguration {
	host: string;
	port: number;
	emuPath: string;
	romPath: string;
}

export class ZGAssProgressStartEvent extends Event implements DebugProtocol.ProgressStartEvent {
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

export class ZGAssProgressUpdateEvent extends Event implements DebugProtocol.ProgressUpdateEvent {
	body: {
		progressId: string;
		message?: string;
		percentage?: number;
	};
	constructor(progressId: string, message?: string, percentage?: number) {
		super('progressUpdate');
		this.body = {
			progressId, message, percentage,
		};
	}
}