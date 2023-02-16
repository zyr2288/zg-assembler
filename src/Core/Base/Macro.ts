import { ICommonLine, IUnknowLine, LineType } from "../Lines/CommonLine";
import { Utils } from "./Utils";
import { ILabel, LabelUtils } from "./Label";
import { Token } from "./Token";
import { DecodeOption } from "./Options";
import { Compiler } from "./Compiler";
import { MyException } from "./MyException";
import { Localization } from "../i18n/Localization";
import { ExpressionPart, ExpressionUtils } from "./ExpressionUtils";

export interface IMacroLine extends ICommonLine {
	macro: Token;
	args: ExpressionPart[][];
	expression: Token;
}

export class Macro {
	name!: Token;
	args: Token[] = [];
	labels = new Map<number, ILabel>();
	lines: ICommonLine[] = [];
	comment?: string;

	GetCopy() {
		return Utils.DeepClone<Macro>(this);
	}
}

export class MacroUtils {

	//#region 匹配一行自定义函数
	/**匹配一行自定义函数 */
	static MatchMacroLine(labelToken: Token, macroToken: Token, expression: Token, option: DecodeOption) {
		if (!labelToken.isEmpty)
			LabelUtils.CreateLabel(labelToken, option);

		let macro = Compiler.enviroment.allMacro.get(macroToken.text)!;
		let macroLine = {
			macro: macroToken,
			args: [],
			expression: expression,
			type: LineType.Macro,
			orgText: option.allLines[option.lineIndex].orgText,
			finished: false
		} as IMacroLine;
		option.allLines[option.lineIndex] = macroLine;

		let parts: Token[] = [];
		if (!expression.isEmpty) {
			parts = expression.Split(/\,/g);
		}

		if (parts.length != macro.args.length) {
			let errorMsg = Localization.GetMessage("Macro arguments error");
			MyException.PushException(macroToken, errorMsg);
			return;
		}

		let temp: ExpressionPart[] | undefined;
		for (let i = 0; i < parts.length; ++i) {
			if (temp = ExpressionUtils.SplitAndSort(parts[i]))
				macroLine.args[i] = temp;
		}

	}
	//#endregion 匹配一行自定义函数
	
}