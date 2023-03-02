import { Compiler } from "./Base/Compiler";
import { Config } from "./Base/Config";
import { ExpressionUtils } from "./Base/ExpressionUtils";
import { FileUtils } from "./Base/FileUtils";
import { MyException } from "./Base/MyException";
import { Utils } from "./Base/Utils";
import { Commands } from "./Commands/Commands";
import { Localization } from "./I18n/Localization";
import { DocumentChangeProvider } from "./LanguageHelper/DocumentChangeProvider";
import { HelperUtils } from "./LanguageHelper/HelperUtils";
import { HighlightingProvider } from "./LanguageHelper/HighlightingProvider";
import { HoverProvider } from "./LanguageHelper/HoverProvider";
import { IntellisenseProvider } from "./LanguageHelper/IntellisenseProvider";
import { Platform } from "./Platform/Platform";

export class Assembler {

	fileUtils = FileUtils;
	platform = Platform;
	config = Config;
	exceptions = MyException;
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
	};

	compiler = {
		DecodeText: Compiler.DecodeText,
		CompileText: Compiler.CompileText
	}

	Initialize() {
		ExpressionUtils.Initialize();
		Commands.Initialize();
		Platform.ChangePlatform(Config.ProjectSetting.platform);
	}


	async LoadAllFile(files: { text: string, filePath: string }[]) {
		HelperUtils.fileUpdateFinished = false;
		await Compiler.DecodeText(files);
		HelperUtils.fileUpdateFinished = true;
	}

	GetUpdateLines(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		return Compiler.enviroment.allBaseLines.get(hash) ?? [];
	}
}
