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
import { ZGAssemblerDebugAdapterFactory } from "./DebugAdapterFactory";

export class LanguageServer {

	private assembler!: Assembler;

	async Initialize(context: vscode.ExtensionContext) {

		LSPUtils.assembler = this.assembler = new Assembler();
		LSPUtils.StatueBarShowText(` $(sync~spin) ${LSPUtils.assembler.localization.GetMessage("plugin loading")}...`);

		await IOImplementation.Initialize();
		await ConfigUtils.ReadConfig();
		this.assembler.Initialize();
		this.SetLanguage(vscode.env.language);

		const classes = [
			Highlighting, UpdateFile, DefinitionProvider, Intellisense,
			HoverProvider, AssCommands, ZGAssemblerDebugAdapterFactory
		];
		for (let i = 0; i < classes.length; i++) {
			let temp = Reflect.get(classes[i], "Initialize");
			await temp(context);
		}

		// await Highlighting.Initialize(context);
		// await UpdateFile.Initialize(context);
		// await DefinitionProvider.Initialize(context);
		// await Intellisense.Initialize(context);
		// HoverProvider.Initialize(context);

		// AssCommands.Initialize(context);
		// DebugAdapterFactory.Initialize(context);

		UpdateFile.LoadAllFile();

		const msg = LSPUtils.assembler.localization.GetMessage("plugin loaded");
		LSPUtils.StatueBarShowText(` $(check) ${msg}`, 3000);
	}

	private SetLanguage(language: string) {
		this.assembler.localization.ChangeLanguage(language);
	}
}