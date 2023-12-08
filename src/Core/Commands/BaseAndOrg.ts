import { Compiler } from "../Base/Compiler";
import { ExpressionResult, ExpressionUtils } from "../Base/ExpressionUtils";
import { DecodeOption } from "../Base/Options";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

export class BaseAndOrg {

	static Initialize() {
		Commands.AddCommand({
			name: ".BASE", min: 1, label: false, ableMacro: true,
			firstAnalyse: Commands.FirstAnalyse_Common,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: BaseAndOrg.Compile_Base
		});

		Commands.AddCommand({
			name: ".ORG", min: 1, label: false, ableMacro: true,
			firstAnalyse: Commands.FirstAnalyse_Common,
			thirdAnalyse: Commands.ThirdAnalyse_Common,
			compile: BaseAndOrg.Compile_Org
		});
	}

	private static Compile_Base(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let temp = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.GetResultAndShowError, option);
		if (temp.success && temp.value < 0) {
			line.compileType = LineCompileType.Error;
			return;
		}

		line.compileType = LineCompileType.Finished;
		Compiler.enviroment.baseAddress = temp.value;
		Compiler.enviroment.addressOffset = Compiler.enviroment.baseAddress - Compiler.enviroment.orgAddress;
	}

	private static Compile_Org(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		let temp = ExpressionUtils.GetExpressionValue(line.expParts[0], ExpressionResult.GetResultAndShowError);
		if (!temp.success || temp.value < 0) {
			line.compileType = LineCompileType.Error;
			return;
		}

		line.compileType = LineCompileType.Finished;
		let temp2 = Compiler.enviroment.orgAddress;
		Compiler.enviroment.orgAddress = temp.value;
		if (Compiler.enviroment.baseAddress < 0)
			Compiler.enviroment.baseAddress = 0;

		if (temp2 >= 0) {
			Compiler.enviroment.baseAddress = Compiler.enviroment.orgAddress + Compiler.enviroment.addressOffset;
		} else {
			Compiler.enviroment.addressOffset = Compiler.enviroment.baseAddress - Compiler.enviroment.orgAddress;
		}
		// GlobalVar.env.addressOffset = GlobalVar.env.baseAddress - GlobalVar.env.originalAddress;

	}
}