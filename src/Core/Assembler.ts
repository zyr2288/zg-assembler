import { Compiler } from "./Base/Compiler";
import { Config } from "./Base/Config";
import { ExpressionUtils } from "./Base/ExpressionUtils";
import { FileUtils } from "./Base/FileUtils";
import { MyDiagnostic } from "./Base/MyException";
import { Commands } from "./Commands/Commands";
import { Localization } from "./I18n/Localization";
import { DefinitionProvider } from "./LanguageHelper/DefinitionProvider";
import { DocumentChangeProvider } from "./LanguageHelper/DocumentChangeProvider";
import { HighlightingProvider } from "./LanguageHelper/HighlightingProvider";
import { HoverProvider } from "./LanguageHelper/HoverProvider";
import { IntellisenseProvider } from "./LanguageHelper/IntellisenseProvider";
import { Platform } from "./Platform/Platform";

export class Assembler {

	fileUtils = FileUtils;
	platform = Platform;
	config = Config;
	diagnostic = MyDiagnostic;
	localization = Localization;
	// expressionUtils = ExpressionUtils;
	// compiler = assembler.Compiler.ZGAssembler.Compiler;
	// utils = Utils;
	// labelUtils = LabelUtils;

	languageHelper = {
		highlightingProvider: HighlightingProvider,
		documentChange: DocumentChangeProvider,
		hoverProvider: HoverProvider,
		intellisense: IntellisenseProvider,
		definition: DefinitionProvider
	};

	compiler = {
		/**true为正在编译中 */
		compiling: this.compiling,
		DecodeText: Compiler.DecodeText,
		CompileText: Compiler.CompileText,
	}

	Initialize() {
		ExpressionUtils.Initialize();
		Commands.Initialize();
		Platform.ChangePlatform(Config.ProjectSetting.platform);
	}

	GetUpdateLines(filePath: string) {
		let hash = FileUtils.GetFilePathHashcode(filePath);
		return Compiler.enviroment.allBaseLines.get(hash) ?? [];
	}

	ClearFile(filePath: string) {
		let hash = FileUtils.GetFilePathHashcode(filePath);
		Compiler.enviroment.ClearFile(hash);
	}

	private get compiling() {
		return Compiler.compiling;
	}

}
