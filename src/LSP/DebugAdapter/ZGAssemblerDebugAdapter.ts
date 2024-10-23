import * as vscode from "vscode";
import { LSPUtils } from "../LSPUtils";
import { ZGAssemblerDebugSession } from "./ZGAssemblerDebugSession";

/**与lanch的type一致 */
const DebugType = "zgassembler";

export class ZGAssemblerDebugAdapter {

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.debug.registerDebugConfigurationProvider(DebugType, new ZGAssemblerDebugConfig())
		);

		context.subscriptions.push(
			vscode.debug.registerDebugAdapterDescriptorFactory(DebugType, new ZGAssemblerDebugFactory())
		);
	}

}

class ZGAssemblerDebugFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
		const temp = new vscode.DebugAdapterInlineImplementation(new ZGAssemblerDebugSession(session.configuration));
		return temp;
	}
}

class ZGAssemblerDebugConfig implements vscode.DebugConfigurationProvider {

	async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken) {

		// 如果 launch.json 缺失
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === LSPUtils.assembler.config.FileExtension.language) {
				config.type = DebugType;
				config.name = "ZG-Assembler Debugger";
				config.request = "attach";
				config.host = "127.0.0.1";
				config.port = 4065;
				config.romOffset = -16;
			}
		}

		return config;
	}
}