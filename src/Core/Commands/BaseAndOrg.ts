import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyException } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Localization } from "../i18n/Localization";
import { LineCompileType as LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

export class BaseAndOrg {

	static Initialize() {
		Commands.AddCommand({
			name: ".BASE", min: 1,
			firstAnalyse: Commands.FirstAnalyse_Common,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: BaseAndOrg.Compile_Base
		});

		Commands.AddCommand({
			name: ".ORG", min: 1,
			firstAnalyse: Commands.FirstAnalyse_Common,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: BaseAndOrg.Compile_Org
		});
	}

	private static Compile_Base(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		let temp = ExpressionUtils.GetExpressionValue(line.expParts[0], "getValue", option);
		if (temp.success && temp.value < 0) {
			// let errorMsg = Localization.GetMessage("Command arguments error");
			// MyException.PushException(line.expParts[0][0], errorMsg);
			return false;
		}

		line.compileType = LineCompileType.Finished;
		Compiler.enviroment.baseAddress = temp.value;
		Compiler.enviroment.addressOffset = Compiler.enviroment.baseAddress - Compiler.enviroment.orgAddress;
		return true;
	}

	private static Compile_Org(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;
		let tag = line.tag as ExpressionPart[];

		let temp = ExpressionUtils.GetExpressionValue(tag, "getValue");
		if (!temp.success || temp.value < 0) {
			// let errorMsg = Localization.GetMessage("Command arguments error");
			// MyException.PushException(line.expression, errorMsg);
			return false;
		}

		line.compileType = LineCompileType.Finished;
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
}
