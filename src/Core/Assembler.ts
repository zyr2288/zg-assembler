import { Compiler } from "./Base/Compiler";
import { Config } from "./Base/Config";
import { ExpressionUtils } from "./Base/ExpressionUtils";
import { MyException } from "./Base/MyException";
import { Localization } from "./l10n/Localization";

export class Assembler {
	
	compiler = Compiler;
	exceptions = MyException;
	config = Config;
	expressionUtils = ExpressionUtils;
	localization = Localization;

	constructor() {
		ExpressionUtils.Initialize();
	}


}