import * as vscode from "vscode";
import { Assembler } from "../Core/Assembler";
import { AssCommands } from "./AssCommands";
import { ConfigUtils } from "./ConfigUtils";
import { DefinitionProvider } from "./DefinitionProvider";
import { Highlighting } from "./Highlighting";
import { HoverProvider } from "./HoverProvider";
import { Intellisense } from "./Intellisense";
import { IOImplementation } from "./IOImplementation";
import { LSPUtils } from "./LSPUtils";
import { UpdateFile } from "./UpdateFile";

export class LanguageServer {

	private assembler!: Assembler;

	async Initialize() {
		LSPUtils.assembler = this.assembler = new Assembler();
		LSPUtils.StatueBarShowText(` $(sync~spin) ${LSPUtils.assembler.localization.GetMessage("plugin loading")}...`);

		await IOImplementation.Initialize();
		await ConfigUtils.ReadConfig();
		this.assembler.Initialize();
		this.SetLanguage(vscode.env.language);

		const classes = [
			Highlighting, UpdateFile, DefinitionProvider,
			Intellisense, HoverProvider, AssCommands
		];
		for (let i = 0; i < classes.length; ++i) {
			let temp = Reflect.get(classes[i], "Initialize");
			await temp();
		}

		UpdateFile.LoadAllFile();

		LSPUtils.StatueBarShowText(` $(check) ${LSPUtils.assembler.localization.GetMessage("plugin loaded")}`, 3000);
	}

	private SetLanguage(language: string) {
		this.assembler.localization.ChangeLanguage(language);
	}
}