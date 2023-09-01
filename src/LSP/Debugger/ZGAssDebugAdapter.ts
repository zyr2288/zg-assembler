import * as vscode from "vscode";
import { LSPUtils } from "../LSPUtils";
import { ZGAssDebugConfigProvider } from "./ZGAssDebugConfigProvider";
import { ZGAssDebugSession } from "./ZGAssDebugSession";

export class ZGAssDebugAdapter implements vscode.DebugAdapterDescriptorFactory {

	static Initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.debug.registerDebugConfigurationProvider(
				LSPUtils.assembler.config.DebugConfig.DebugType,
				new ZGAssDebugConfigProvider()
			)
		);

		context.subscriptions.push(
			vscode.debug.registerDebugAdapterDescriptorFactory(
				LSPUtils.assembler.config.DebugConfig.DebugType,
				new ZGAssDebugAdapter(context)
			)
		);
	}

	private readonly context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new ZGAssDebugSession(this.context, _session));
	}
}