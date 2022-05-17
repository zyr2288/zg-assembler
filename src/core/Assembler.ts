import { LexerUtils } from "./Utils/LexerUtils";
import { Compile } from "./Base/Compile";
import { Instructions } from "./Base/Instructions";
import { Commands } from "./Base/Commands";
import { FileUtils } from "./Utils/FileUtils";
import { BaseHelper } from "./Base/BaseHelper";
import { Config } from "./Base/Config";
import { Utils } from "./Utils/Utils";
import { MyException } from "./Base/MyException";
import { MacroUtils } from "./Utils/MacroUtils";
import { LebalUtils } from "./Utils/LebalUtils";

export class Assembler {

	baseHelper = BaseHelper;
	config = Config;
	compile = Compile;
	fileUtils = FileUtils;
	myException = MyException;
	utils = Utils;

	constructor() {
		this.Initialize();
	}

	Initialize() {
		LexerUtils.Initialize();
		Commands.Initialize();
		BaseHelper.UpdateHelper();
	}

	GetInstrctionsRegex() {
		return Instructions.platform.instructionsRegex;
	}

	GetMacroMatch(text: string) {
		return MacroUtils.RegexMatch(text);
	}

	/**用于独立编译器，获取关键字 */
	GetKeyword() {
		return Instructions.platform.allKeyword;
	}

	/**用于独立编译器，获取所有命令 */
	GetCommand() {
		let result: string[] = [];
		for (let key in Commands.allCommands) {
			result.push(key);
			Commands.allCommands[key].includeCommand?.forEach(v => {
				result.push(v.name);
			});
			if (Commands.allCommands[key].endCommand)
				result.push(Commands.allCommands[key].endCommand!);
		}
		return result;
	}

	/**用于独立编译器，读取第一行获取平台 */
	GetFilePlatform(text: string) {
		let index = text.indexOf("\n");
		if (index < 0) {
			BaseHelper.SwitchPlatform("6502");
			return;
		} else {
			text = text.substring(0, index).trim();
		}

		index = text.indexOf(";");
		if (index < 0) {
			BaseHelper.SwitchPlatform("6502");
			return;
		}
		text = text.substring(index + 1).trim();
		BaseHelper.SwitchPlatform(text);
	}

};

// @ts-ignore
globalThis.Assembler = Assembler;