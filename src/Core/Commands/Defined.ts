import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelUtils } from "../Base/Label";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Commands, ICommandLine, ICommandTag } from "./Commands";

export interface IDefinedTag extends ICommandTag {
	label: ILabel;
	exprParts: ExpressionPart[];
}

function FirstAnalyse_Def(option: DecodeOption) {
	let line = option.allLines[option.lineIndex] as ICommandLine;
	let tokens: Token[] = line.tag;
	let label = LabelUtils.CreateLabel(tokens[0], undefined, line.comment);
	if (!label) {
		line.errorLine = true;
		return false;
	}

	label.labelDefined = LabelDefinedState.Defined;
	line.label = tokens[0];
	tokens[0].type = TokenType.Defined;
	line.tokens.push(tokens[0]);

	let temp = LexerUtils.SplitAndSort(tokens[1]);
	if (!temp) {
		line.errorLine = true;
		return false;
	}

	line.tag = temp;
	return true;
}

function SecondAnalyse_Def(option: DecodeOption) {

}

function ThirdAnalyse_Def(option: DecodeOption) {

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
	
})