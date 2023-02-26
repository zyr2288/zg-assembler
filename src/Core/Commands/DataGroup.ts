import { ExpressionPart } from "../Base/ExpressionUtils";
import { DecodeOption } from "../Base/Options";
import { ICommandTag } from "./Commands";

export interface IDataGroupTag extends ICommandTag {
	exprParts: ExpressionPart[][]
}

export class DataGroup {

	static Initialize() {

	}

	static FirstAnalyse_DataGroup(option:DecodeOption) {
		
	}

}
