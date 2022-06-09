import { BaseHelper } from "./Base/BaseHelper";
import { Commands } from "./Base/Commands";
import { Compile } from "./Base/Compile";
import { Config } from "./Base/Config";
import { MyException } from "./Base/MyException";
import { Platform } from "./Platform/Platform";
import { FileUtils } from "./Utils/FileUtils";
import { LexerUtils } from "./Utils/LexerUtils";
import { Utils } from "./Utils/Utils";

export class Assembler {
	
	baseHelper = BaseHelper;
	compile = Compile;
	config = Config;
	fileUtils = FileUtils;
	myException = MyException;
	platform = Platform;
	utils = Utils;

	constructor() {
		LexerUtils.Initialize();
		Commands.Initialize();
	}
}

// @ts-ignore
globalThis.Assembler = Assembler;