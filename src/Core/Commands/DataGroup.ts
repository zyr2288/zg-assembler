import { Compiler } from "../Base/Compiler";
import { ExpressionPart } from "../Base/ExpressionUtils";
import { MyException } from "../Base/MyException";
import { SplitOption } from "../Base/Options";
import { Localization } from "../i18n/Localization";
import { HightlightRange } from "../Lines/CommonLine";
import { ICommandLine, ICommandTag } from "./Commands";

export interface IDataGroupTag extends ICommandTag {
	exprParts: ExpressionPart[][]
}
