import { Compiler } from "./Base/Compiler";
import { Config } from "./Base/Config";
import { ExpressionUtils } from "./Base/ExpressionUtils";
import { MyException } from "./Base/MyException";
import { Localization } from "./i18n/Localization";
import { Platform } from "./Platform/Platform";

export class Assembler {
	
	compiler = Compiler;
	exceptions = MyException;
	config = Config;
	expressionUtils = ExpressionUtils;
	localization = Localization;

	constructor() {
		ExpressionUtils.Initialize();
		Platform.ChangePlatform("6502");
	}


}