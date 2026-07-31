import * as vscode from "vscode";
import { ZGAssembler } from "../Core/ZGAssembler";

export interface CompileOption {
	outFilePath: string;
	compileType: "entry" | "single";
	outputBin?: Int16Array;
}

export interface IPlugin {
	name: string;
	assembler: ZGAssembler;
	option: any;

	Initialize(assembler: ZGAssembler, option: any): void | Promise<void>;
	BeforeCompile?(option: CompileOption): void | Promise<void>;
	AfterCompile?(option: CompileOption): void | Promise<void>;
}