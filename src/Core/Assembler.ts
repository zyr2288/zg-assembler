import { Compiler } from "./Base/Compiler";
import { Config } from "./Base/Config";
import { ExpressionUtils } from "./Base/ExpressionUtils";
import { FileUtils } from "./Base/FileUtils";
import { MyException } from "./Base/MyException";
import { Utils } from "./Base/Utils";
import { Commands } from "./Commands/Commands";
import { Localization } from "./i18n/Localization";
import { Platform } from "./Platform/Platform";

export class Assembler {

	fileUtils = FileUtils;
	compiler = Compiler;
	exceptions = MyException;
	config = Config;
	expressionUtils = ExpressionUtils;
	localization = Localization;
	platform = Platform;
	utils = Utils;

	constructor() {
		ExpressionUtils.Initialize();
		Commands.Initialize();
		Platform.ChangePlatform("6502");
	}

	GetUpdateLines(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		return Compiler.enviroment.allBaseLines.get(hash) ?? [];
	}

}