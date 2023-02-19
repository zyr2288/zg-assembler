import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Commands, ICommandLine, ICommandTag } from "./Commands";

export interface IDefinedTag extends ICommandTag {
	label: ILabel;
	exprParts: ExpressionPart[];
}

export class Defined {
	static FirstAnalyse_Def(option: DecodeOption) {

		return true;
	}
}

function FirstAnalyse_Def(option: DecodeOption) {

	return true;
}

function SecondAnalyse_Def(option: DecodeOption) {

}

function ThirdAnalyse_Def(option: DecodeOption) {
	return true;

}

function Compile_Def(option: DecodeOption) {
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

Commands.AddCommand({
	name: ".DEF",
	min: 1,
	firstAnalyse: FirstAnalyse_Def,
	thirdAnalyse: ThirdAnalyse_Def,
	compile: Compile_Def
})