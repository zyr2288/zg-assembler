import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { MyException } from "../Base/MyException";
import { DecodeOption, SplitOption } from "../Base/Options";
import { Localization } from "../i18n/Localization";
import { CommonLineUtils, HightlightRange, LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine, ICommandTag } from "./Commands";

export interface IDataGroupTag extends ICommandTag {
	exprParts: ExpressionPart[][]
}

export class DataGroup {
	
	static Initialize() {

	}


}
