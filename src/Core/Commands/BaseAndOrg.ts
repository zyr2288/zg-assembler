import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyException } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Localization } from "../i18n/Localization";
import { ICommandLine } from "./Commands";

//#region 编译Base
export function Compile_Base(option: DecodeOption) {
	let line = option.allLines[option.lineIndex] as ICommandLine;
	let tag = line.tag as ExpressionPart[];
	let temp = ExpressionUtils.GetExpressionValue(tag, "getValue", option);
	if (temp.success && temp.value < 0) {
		let errorMsg = Localization.GetMessage("Command arguments error");
		MyException.PushException(line.expression, errorMsg);
		return false;
	}

	line.finished = true;
	Compiler.enviroment.baseAddress = temp.value;
	Compiler.enviroment.addressOffset = Compiler.enviroment.baseAddress - Compiler.enviroment.orgAddress;
	return true;
}
//#endregion 编译Base

//#region 编译Org
export function Compile_Org(option: DecodeOption) {
	let line = option.allLines[option.lineIndex] as ICommandLine;
	let tag = line.tag as ExpressionPart[];

	let temp = ExpressionUtils.GetExpressionValue(tag, "getValue");
	if (!temp.success || temp.value < 0) {
		let errorMsg = Localization.GetMessage("Command arguments error");
		MyException.PushException(line.expression, errorMsg);
		return false;
	}

	line.finished = true;
	let temp2 = Compiler.enviroment.orgAddress;
	Compiler.enviroment.orgAddress = temp.value;
	if (temp2 >= 0) {
		Compiler.enviroment.baseAddress = Compiler.enviroment.orgAddress + Compiler.enviroment.addressOffset;
	} else {
		Compiler.enviroment.addressOffset = Compiler.enviroment.baseAddress - Compiler.enviroment.orgAddress;
	}
	// GlobalVar.env.addressOffset = GlobalVar.env.baseAddress - GlobalVar.env.originalAddress;

	return true;
}
//#endregion 编译Org
