import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { HightlightToken, HightlightType } from "../Lines/CommonLine";
import { Commands, ICommandLine, ICommandTag } from "./Commands";

export class Defined {

	static Initialize() {
		Commands.AddCommand({
			name: ".DEF",
			min: 2,
			firstAnalyse: Defined.FirstAnalyse_Def,
			thirdAnalyse: Defined.ThirdAnalyse_Def,
			compile: Defined.Compile_Def
		})
	}

	static FirstAnalyse_Def(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;

		line.tag

		return true;
	}

	static ThirdAnalyse_Def(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;




		line.GetTokens = Commands.GetTokens.bind(line);
		return true;
	}

	static Compile_Def(option: DecodeOption) {
		let line = option.allLines[option.lineIndex] as ICommandLine;

		let tag = line.tag as ExpressionPart[];


		let temp = ExpressionUtils.GetExpressionValue(tag, "getValue");
		let label = LabelUtils.FindLabel(line.label!.token, option);
		if (label && temp.success) {
			label.value = temp.value;
			line.finished = true;
			return true;
		}
		return false;
	}



}
