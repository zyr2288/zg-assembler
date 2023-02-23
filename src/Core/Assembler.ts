import { Compiler } from "./Base/Compiler";
import { Config } from "./Base/Config";
import { ExpressionUtils } from "./Base/ExpressionUtils";
import { FileUtils } from "./Base/FileUtils";
import { MyException } from "./Base/MyException";
import { Utils } from "./Base/Utils";
import { Commands } from "./Commands/Commands";
import { DocumentChangeProvider } from "./LanguageHelper/DocumentChangeProvider";
import { HighlightingProvider } from "./LanguageHelper/HighlightingProvider";
import { HoverProvider } from "./LanguageHelper/HoverProvider";
import { Platform } from "./Platform/Platform";

export class Assembler {

	fileUtils = FileUtils;
	platform = Platform;
	config = Config;
	exceptions = MyException;
	// expressionUtils = ExpressionUtils;
	// compiler = assembler.Compiler.ZGAssembler.Compiler;
	// localization = Localization;
	// utils = Utils;
	// labelUtils = LabelUtils;

	languageHelper = {
		highlightingProvider: HighlightingProvider,
		documentChange: DocumentChangeProvider,
		hoverProvider: HoverProvider,
	};

	constructor() {
		ExpressionUtils.Initialize();
		Commands.Initialize();
		Platform.ChangePlatform("6502");
	}

	async LoadAllFile(files: { text: string, filePath: string }[]) {
		await Compiler.DecodeText(files);
	}

	GetUpdateLines(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		return Compiler.enviroment.allBaseLines.get(hash) ?? [];
	}
}
