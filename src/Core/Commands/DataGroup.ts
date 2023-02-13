import { Compiler } from "../Base/Compiler";
import { ExpressionPart } from "../Base/ExpressionUtils";
import { MyException } from "../Base/MyException";
import { SplitOption } from "../Base/Options";
import { Localization } from "../l10n/Localization";
import { HightlightRange } from "../Lines/CommonLine";
import { ICommandLine, ICommandTag } from "./Commands";

export interface IDataGroupTag extends ICommandTag {
	exprParts: ExpressionPart[][]
}

export class DataGroupUtils {

	static saveRange?: HightlightRange;

	ParseDataGroupStart(option: SplitOption) {
		if (DataGroupUtils.saveRange) {
			let line = option.line as ICommandLine;
			let errorMsg = Localization.GetMessage("Command {0} Error", line.command.text);
			MyException.PushException(line.command, option.fileHash, errorMsg);
			return;
		}

		let range: HightlightRange = { type: "DataGroup", start: option.lineEnd, end: 0 };
		DataGroupUtils.saveRange = range;
		Compiler.enviroment.SetRange(option.fileHash, range);
	}

	ParseDataGroupEnd(option: SplitOption) {
		if (!DataGroupUtils.saveRange) {
			let line = option.line as ICommandLine;
			let errorMsg = Localization.GetMessage("Command {0} Error", line.command.text);
			MyException.PushException(line.command, option.fileHash, errorMsg);
			return;
		}

		DataGroupUtils.saveRange.end = option.lineStart;
		delete(DataGroupUtils.saveRange);
	}
}