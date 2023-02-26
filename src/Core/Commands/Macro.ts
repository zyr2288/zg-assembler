import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel, LabelUtils } from "../Base/Label";
import { MyException } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { ICommonLine, LineCompileType, LineType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

export interface IMacroLine extends ICommonLine {
	macro: Token;
	args: ExpressionPart[][];
	expression: Token;
}

export class IMacro {
	name!: Token;
	args: Token[] = [];
	labels = new Map<number, ILabel>();
	lines: ICommonLine[] = [];
	comment?: string;

	GetCopy() {
		return Utils.DeepClone<IMacro>(this);
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
			compileType: LineCompileType.None
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

export class MacroCommand {
	static Initialize() {
		Commands.AddCommand({
			name: ".MACRO", end: ".ENDM", min: 1, max: -1,
			nested: false,
			label: false,
			ableMacro: false,
		})
	}

	static FirstAnalyse(option: DecodeOption) {

		Compiler.FirstAnalyse(option)
	}

	static ThirdAnalyse(option: DecodeOption) {
		Compiler.ThirdAnalyse(option);
	}
}