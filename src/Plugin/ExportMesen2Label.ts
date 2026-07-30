import * as vscode from "vscode";
import { ZGAssembler } from "../Core/ZGAssembler";
import { IPlugin } from "./IPlugin";

export class ExportMesen2Label implements IPlugin {

	name = "ExportMesen2Label";
	option = {
		labelExclude: [] as string[],
		fileExclude: [] as string[],
	}

	private assembler!: ZGAssembler;

	Initialize(assembler: ZGAssembler, option: typeof this.option) {
		this.assembler = assembler;
		Object.assign(this.option, option);
	}

	async AfterCompile(): Promise<void> {

		const result: Record<string, number> = {};
		const nameExcludeRegex = this.option.labelExclude.map((item) => new RegExp(item));

		for (const [key, label] of this.assembler.compiler.enviroment.allLabel.global) {
			if (nameExcludeRegex.some((item) => item.test(key)))
				continue;

			if (this.option.fileExclude.some((item) => {
				return label.fileIndex === this.assembler.compiler.enviroment.GetFileIndex(item, false);
			}))
				continue;

			if (label.value !== undefined)
				result[label.token.text] = label.value;
		}

		
		
	}
}