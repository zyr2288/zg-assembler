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
import { RenameProvider } from "./RenameProvider";
import { ReferencesProvider } from "./ReferencesProvider";
import { TextDecoration } from "./TextDecoration";

export class LanguageServer {

	private assembler!: Assembler;

	async Initialize(context: vscode.ExtensionContext) {

		LSPUtils.assembler = this.assembler = new Assembler();
		LSPUtils.StatueBarShowText(` $(sync~spin) ${LSPUtils.assembler.localization.GetMessage("plugin loading")}...`);

		IOImplementation.Initialize();
		await ConfigUtils.ReadConfig();
		this.assembler.Initialize();
		this.SetLanguage(vscode.env.language);

		// 怕看不懂，直接改成这个形式，顺序不能变动
		Highlighting.Initialize(context);
		UpdateFile.Initialize(context);
		DefinitionProvider.Initialize(context);
		RenameProvider.Initialize(context);
		ReferencesProvider.Initialize(context);
		Intellisense.Initialize(context);
		TextDecoration.Initialize(context);
		// LabelTreeViewer.Initialize(context);

		HoverProvider.Initialize(context);
		AssCommands.Initialize(context);

		await UpdateFile.LoadAllFile();

		const msg = LSPUtils.assembler.localization.GetMessage("plugin loaded");
		LSPUtils.StatueBarShowText(` $(check) ${msg}`, 3000);
	}

	private SetLanguage(language: string) {
		this.assembler.localization.ChangeLanguage(language);
	}
}