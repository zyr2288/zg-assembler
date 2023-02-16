import { ICommonLine, IUnknowLine, LineType } from "../Lines/CommonLine";
import { Utils } from "./Utils";
import { ILabel, LabelUtils } from "./Label";
import { Token } from "./Token";
import { DecodeOption } from "./Options";
import { Compiler } from "./Compiler";

export interface IMacroLine extends ICommonLine {
	macro: Token;
	expression: Token;
}

export class Macro {
	name!: Token;
	labels: Map<number, ILabel> = new Map();
	lines!: ICommonLine[];
	comment?: string;

	GetCopy() {
		return Utils.DeepClone<Macro>(this);
	}
}

export class MacroUtils {
	static CreateLine(pre: Token, currect: Token, after: Token, option: DecodeOption) {
		let macro = Compiler.enviroment.allMacro.get(currect.text)!;
		let macroLine = { macro: currect, expression: after, type: LineType.Macro } as IMacroLine;
		if (!pre.isEmpty)
			LabelUtils.CreateLabel(pre, option);
		
		if (!after.isEmpty) {
			let parts = after.Split(/\,/g);
		}

		option.allLines[option.lineIndex] = macroLine;
	}
}