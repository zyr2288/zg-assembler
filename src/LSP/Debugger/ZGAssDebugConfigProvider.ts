import * as vscode from "vscode";
import { LSPUtils } from "../LSPUtils";

/**用于载入配置文件 */
export class ZGAssDebugConfigProvider implements vscode.DebugConfigurationProvider {
	resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken | undefined): vscode.ProviderResult<vscode.DebugConfiguration> {
		if (!config.type && !config.name) {
			const msg = LSPUtils.assembler.localization.GetMessage("Cannot find launch.json");
			return vscode.window.showInformationMessage(msg).then(_config => {
				return undefined;
			});
		}

		if (!config.emuPath) {
			const msg = LSPUtils.assembler.localization.GetMessage("Cannot find program path {0}");
			return vscode.window.showInformationMessage(msg).then(_config => {
				return undefined;
			});
		}

		if (!config.romPath) {
			const msg = LSPUtils.assembler.localization.GetMessage("Cannot find rom file {0}");
			return vscode.window.showInformationMessage(msg).then(_config => {
				return undefined;
			});
		}

		config.host = LSPUtils.assembler.config.DebugConfig.DebugHost;
		config.port = LSPUtils.assembler.config.DebugConfig.DebugPort;
		return config;
	}
}