import * as vscode from "vscode";
import { LSPUtils } from "../LSPUtils";
import { ZGAssemblerDebugConfig, ZGAssemblerDebugSession } from "./ZGAssemblerDebugSession";
import { AssCommands } from "../AssCommands";

/**与lanch的type一致 */
const DebugType = "ZG-Assembler";
const DebugReloadCommand = "zg-assembly.reloadRom";

export class ZGAssemblerDebugAdapter {

	static debugAdapterOption: {
		HotReloadHandle?: (rootPath: string) => void;
	} = {};

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.debug.registerDebugConfigurationProvider(DebugType, new ZGAssemblerDebugConfigProvider())
		);

		context.subscriptions.push(
			vscode.debug.registerDebugAdapterDescriptorFactory(DebugType, new ZGAssemblerDebugFactory())
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(DebugReloadCommand, () => {
				let folder = vscode.workspace.workspaceFolders?.[0];
				if (!folder)
					return;

				ZGAssemblerDebugAdapter.debugAdapterOption.HotReloadHandle?.(folder.uri.fsPath);
			})
		);
	}
}

class ZGAssemblerDebugFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
		const debugSession = new ZGAssemblerDebugSession(session.configuration);
		// ZGAssemblerDebugAdapter.debugAdapterOption.reloadRomFunction = debugSession.debugClient.ReloadRom.bind(debugSession.debugClient);
		ZGAssemblerDebugAdapter.debugAdapterOption.HotReloadHandle = async () => {
			const rootFolder = vscode.workspace.workspaceFolders?.[0];
			if (!rootFolder)
				return;
			
			await AssCommands.CompileEntryFile();
			await debugSession.debugClient.HotReload(rootFolder.uri.fsPath, debugSession.config.romOffset);
		}
		const temp = new vscode.DebugAdapterInlineImplementation(debugSession);
		return temp;
	}
}

class ZGAssemblerDebugConfigProvider implements vscode.DebugConfigurationProvider {

	async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: ZGAssemblerDebugConfig, token?: vscode.CancellationToken) {
		// @ts-ignore
		const testValue = parseInt(config.romOffset);
		// 如果 launch.json 缺失
		if (isNaN(testValue)) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === LSPUtils.assembler.config.FileExtension.language) {
				config.name = "Debug rom with Emulator";
				config.request = "attach";
				config.host = "127.0.0.1";
				config.port = 4065;
				config.romOffset = -16;
			}
		}
		return config;
	}
}