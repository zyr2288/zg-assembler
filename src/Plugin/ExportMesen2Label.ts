import * as vscode from "vscode";
import { ZGAssembler } from "../Core/ZGAssembler";
import { IPlugin } from "./IPlugin";

interface Mesen2Label {
	Address: number;
	MemoryType: number;
	Label: string;
	Comment?: string;
	Flags: number;
	Length: number;
}

export class ExportMesen2Label implements IPlugin {

	name = "ExportMesen2Label";
	compileOption = {
		output: "",
		labelExclude: [] as string[],
		fileExclude: [] as string[],
	}

	private assembler!: ZGAssembler;

	Initialize(assembler: ZGAssembler, option: typeof this.compileOption & { compileType: "entry" | "single" }) {
		this.assembler = assembler;
		Object.assign(this.compileOption, option);
	}

	async AfterCompile(): Promise<void> {
		if (this.compileOption.output.trim() === "")
			return;

		const labelValue: Record<string, { value: number, comment?: string }> = {};
		const nameExcludeRegex = this.compileOption.labelExclude.map((item) => new RegExp(item));

		for (const [key, label] of this.assembler.compiler.enviroment.allLabel.global) {
			if (nameExcludeRegex.some((item) => item.test(key)))
				continue;

			if (this.compileOption.fileExclude.some((item) => {
				return label.fileIndex === this.assembler.compiler.enviroment.GetFileIndex(item, false);
			}))
				continue;

			if (label.value !== undefined)
				labelValue[label.token.text] = { value: label.value, comment: label.comment };
		}

		let memoryType = 0;
		switch (this.assembler.config.ProjectSetting.platform) {
			case "6502":
				break;
			case "65c816":
				break;
			case "SM83-gb":
				memoryType = 75;
				break;
			case "SPC700":
				break;
		}

		const result: Mesen2Label[] = [];
		let output = this.compileOption.output;
	}
}