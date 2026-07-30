import * as vscode from "vscode";
import { ZGAssembler } from "../Core/ZGAssembler";

export interface IPlugin {
	name: string;

	Initialize(assembler: ZGAssembler, option: any): void | Promise<void>;
	BeforeCompile?(assembler: ZGAssembler): void | Promise<void>;
	AfterCompile?(assembler: ZGAssembler): void | Promise<void>;
}

export class PluginUtils {
	static async ReadPluginOption(asmFileUri: vscode.Uri) {

	}
}