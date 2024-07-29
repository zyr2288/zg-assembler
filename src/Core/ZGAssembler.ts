import { CompileOption } from "./Base/CompileOption";
import { Compiler } from "./Compiler/Compiler";
import { Config } from "./Base/Config";
import { ExpressionUtils } from "./Base/ExpressionUtils";
import { FileUtils } from "./Base/FileUtils";
import { MyDiagnostic } from "./Base/MyDiagnostic";
import { Command } from "./Command/Command";
import { Localization } from "./I18n/Localization";
import { DocumentChangeProvider } from "./LanguageHelper/DocumentChangeProvider";
import { HighlightingProvider } from "./LanguageHelper/HighlightingProvider";
import { IntellisenseProvider } from "./LanguageHelper/IntellisenseProvider";
import { Platform } from "./Platform/Platform";
import { Analyser } from "./Compiler/Analyser";
import { DefinitionProvider } from "./LanguageHelper/DefinitionProvider";
import { RenameAndReferences } from "./LanguageHelper/RenameAndReferences";
import { HoverProvider } from "./LanguageHelper/HoverProvider";
import { DebugProvider } from "./LanguageHelper/DebugProvider";

export class ZGAssembler {

	config = Config;
	diagnostic = MyDiagnostic;
	fileUtils = FileUtils;
	compiler = Compiler;
	localization = Localization;
	languageHelper = {
		highlighting: HighlightingProvider,
		documentChange: DocumentChangeProvider,
		intellisense: IntellisenseProvider,
		definition: DefinitionProvider,
		renameAndReferences: RenameAndReferences,
		hover: HoverProvider,
		debug: DebugProvider,
	};

	constructor() {
		ExpressionUtils.Initialize();
		Platform.SwitchPlatform("6502");
		Command.Initialize();
	}

	async ParseText(files: { text: string, filePath: string }[]) {
		if (Compiler.isCompiling)
			return;

		Compiler.isCompiling = true;
		Compiler.ChangeEnv("edit");

		const option = new CompileOption();

		// 加了这个，不重复分析
		const fileIndexes: number[] = [];
		for (let i = 0; i < files.length; i++) {
			Compiler.enviroment.fileIndex = Compiler.enviroment.GetFileIndex(files[i].filePath);
			fileIndexes.push(Compiler.enviroment.fileIndex);

			MyDiagnostic.ClearFileExceptions(Compiler.enviroment.fileIndex);
			Compiler.enviroment.ClearFile(Compiler.enviroment.fileIndex);

			Analyser.AnalyseText(files[i].text, files[i].filePath);
		}

		for (const key of fileIndexes) {
			Compiler.enviroment.fileIndex = key;
			option.allLines = Compiler.enviroment.allLine.get(key)!;
			await Analyser.AnalyseFirst(option);
		}

		for (const key of fileIndexes) {
			Compiler.enviroment.fileIndex = key;
			option.allLines = Compiler.enviroment.allLine.get(key)!;
			await Analyser.AnalyseSecond(option);
		}

		for (const key of fileIndexes) {
			Compiler.enviroment.fileIndex = key;
			option.allLines = Compiler.enviroment.allLine.get(key)!;
			await Analyser.AnalyseThird(option);
		}

		Compiler.isCompiling = false;
	}

	async CompileText(text: string, filePath: string) {
		if (Compiler.isCompiling)
			return;

		Compiler.isCompiling = true;
		Compiler.ChangeEnv("compile");

		Compiler.enviroment.compileTime = 0;
		Compiler.enviroment.fileIndex = Compiler.enviroment.GetFileIndex(filePath);

		MyDiagnostic.ClearAll();
		Compiler.enviroment.ClearAll();

		const option = new CompileOption();
		option.allLines = Analyser.AnalyseText(text, filePath);

		for (let i = 0; i < Config.ProjectSetting.compileTimes; i++) {
			Compiler.enviroment.compileTime = i;
			await Compiler.Compile(option);
		}

		if (Compiler.stopCompiling) {
			Compiler.isCompiling = false;
			return;
		}

		const tempResult: number[] = [];
		Compiler.GetLinesResult(option, tempResult);
		Compiler.enviroment.compileResult.finished = true;
		const result = new Int16Array(tempResult.length);
		for (let i = 0; i < tempResult.length; i++) {
			if (tempResult[i] === undefined) {
				result[i] = -1;
				continue;
			}
			result[i] = tempResult[i] & 0xFF;
		}

		Compiler.isCompiling = false;
		return result;
	}

	SwitchPlatform(platform: string) {
		Platform.SwitchPlatform(platform);
	}

	SwitchLanguage(language: string) {
		Localization.ChangeLanguage(language);
	}

	ClearFile(filePath: string) {
		const fileIndex = Compiler.enviroment.GetFileIndex(filePath);
		Compiler.enviroment.ClearFile(fileIndex);
	}
}