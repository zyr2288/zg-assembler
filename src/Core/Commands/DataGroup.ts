import { ExpressionPart } from "../Base/ExpressionUtils";
import { ICommandTag } from "./Commands";

export interface IDataGroupTag extends ICommandTag {
	exprParts: ExpressionPart[][]
}

export class DataGroup {

	static Initialize() {

	}


}
