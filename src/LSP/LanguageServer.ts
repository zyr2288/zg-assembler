import * as vscode from "vscode";
import { ZGAssembler } from "../Core/ZGAssembler";
import { LSPUtils } from "./LSPUtils";
import { Highlighting } from "./Highlighting";
import { UpdateFile } from "./UpdateFile";
import { IOImplementation } from "./IOImplementation";
import { ConfigUtils } from "./ConfigUtils";
import { AssCommands } from "./AssCommands";
import { Definition } from "./Definition";
import { Intellisense } from "./Intellisense";
import { HoverProvider } from "./HoverProvider";
import { Rename } from "./Rename";
import { ZGAssemblerDebugAdapter } from "./DebugAdapter/ZGAssemblerDebugAdapter";
import { ReferencesProvider } from "./ReferencesProvider";
import { TextDecoration } from "./TextDecoration";
import { LabelTreeProvider } from "./LabelTreeProvider";
import { FormatProvider } from "./FormatProvider";

export class LanguageServer {

	private assembler!: ZGAssembler;

	async Initialize(context: vscode.ExtensionContext) {

		LSPUtils.assembler = this.assembler = new ZGAssembler();
		LSPUtils.assembler.languageHelper.intellisense.UpdateCommandCompletions();

		LSPUtils.StatueBarShowText(` $(sync~spin) ${LSPUtils.assembler.localization.GetMessage("plugin loading")}...`);

		IOImplementation.Initialize();

		if (!vscode.window.activeTextEditor){
			LSPUtils.StatueBarShowText(`${LSPUtils.assembler.localization.GetMessage("plugin load error")}`);
			return;
		}

		await ConfigUtils.ReadConfig(vscode.window.activeTextEditor!.document.uri);
		this.assembler.SwitchLanguage(vscode.env.language);

		// 怕看不懂，直接改成这个形式，顺序不能变动
		Highlighting.Initialize(context);
		UpdateFile.Initialize(context);
		Definition.Initialize(context);
		Rename.Initialize(context);
		ReferencesProvider.Initialize(context);
		Intellisense.Initialize(context);
		TextDecoration.Initialize(context);
		LabelTreeProvider.Initialize(context);
		FormatProvider.Initialize(context);

		HoverProvider.Initialize(context);
		AssCommands.Initialize(context);

		ZGAssemblerDebugAdapter.Initialize(context);

		await UpdateFile.LoadAllFile();

		const msg = LSPUtils.assembler.localization.GetMessage("plugin loaded");
		LSPUtils.StatueBarShowText(` $(check) ${msg}`, 3000);
	}
}