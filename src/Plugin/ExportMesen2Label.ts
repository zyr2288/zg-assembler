import * as vscode from "vscode";
import { ZGAssembler } from "../Core/ZGAssembler";
import { CompileOption, IPlugin } from "./IPlugin";

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
	assembler!: ZGAssembler;
	option = {
		output: "",
		labelExclude: [] as string[],
		fileExclude: [] as string[],
	}

	Initialize(assembler: ZGAssembler, option: typeof this.option) {
		this.assembler = assembler;
		Object.assign(this.option, option);
	}

	async AfterCompile(compileOption: CompileOption): Promise<void> {
		if (this.option.output.trim() === "")
			return;

		const nameExcludeRegex = this.option.labelExclude.map((item) => new RegExp(item));

		let memoryType = 0;
		switch (this.assembler.config.ProjectSetting.platform) {
			case "6502":
				memoryType = 8;
				break;
			case "65c816":
				memoryType = 0;
				break;
			case "SM83-gb":
				memoryType = 7;
				break;
			case "SPC700":
				memoryType = 1;
				break;
		}

		const result: Mesen2Label[] = [];
		for (const [key, label] of this.assembler.compiler.enviroment.allLabel.global) {
			if (nameExcludeRegex.some((item) => item.test(key)))
				continue;

			if (this.option.fileExclude.some((item) => {
				return label.fileIndex === this.assembler.compiler.enviroment.GetFileIndex(item, false);
			}))
				continue;

			if (label.value === undefined)
				continue;

			result.push({
				Address: label.value,
				MemoryType: memoryType,
				Label: label.token.text,
				Comment: label.comment,
				Flags: 2,
				Length: 1,
			});
		}

		let output = this.option.output;
		let fileName = compileOption.outFilePath.substring(0, compileOption.outFilePath.lastIndexOf("."));
		output = output.replaceAll("[name]", fileName);
		output = this.assembler.fileUtils.Combine(this.assembler.config.ProjectDir, output);
		const resultBytes = this.assembler.fileUtils.StringToBytes(JSON.stringify(result, undefined, 4));
		await this.assembler.fileUtils.SaveFile(output, resultBytes);
	}
}