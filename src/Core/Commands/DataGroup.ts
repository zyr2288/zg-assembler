import { Compiler } from "../Base/Compiler";
import { Config } from "../Base/Config";
import { ExpressionResult, ExpressionUtils, PriorityType } from "../Base/ExpressionUtils";
import { ILabel, LabelScope, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { CommandDecodeOption, DecodeOption } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands, ICommandLine } from "./Commands";

export class IDataGroup {
	label!: ILabel;
	labelHashAndIndex: Map<number, number[]> = new Map();

	PushData(token: Token, index: number) {
		let hash = Utils.GetHashcode(token.text);
		let labelSet = this.labelHashAndIndex.get(hash) ?? [];
		if (!labelSet.includes(index))
			labelSet.push(index);

		this.labelHashAndIndex.set(hash, labelSet);
	}

	FindData(text: string, index: number) {
		let hash = Utils.GetHashcode(text);
		let labelSet = this.labelHashAndIndex.get(hash);
		if (!labelSet)
			return;

		return labelSet[index];
	}
}

export class DataGroupCommand {

	static Initialize() {
		Commands.AddCommand({
			name: ".DBG", end: ".ENDD", min: 1,
			nested: false, label: false, ableMacro: false,
			firstAnalyse: DataGroupCommand.FirstAnalyse_DataGroup,
			thirdAnalyse: DataGroupCommand.ThirdAnalyse_DataGroup,
			compile: DataGroupCommand.Compile_DataByteGroup,
		});
		Commands.AddCommand({
			name: ".DWG", end: ".ENDD", min: 1,
			nested: false, label: false, ableMacro: false,
			firstAnalyse: DataGroupCommand.FirstAnalyse_DataGroup,
			thirdAnalyse: DataGroupCommand.ThirdAnalyse_DataGroup,
			compile: DataGroupCommand.Compile_DataWordGroup,
		});
		Commands.AddCommand({
			name: ".DLG", end: ".ENDD", min: 1,
			nested: false, label: false, ableMacro: false,
			firstAnalyse: DataGroupCommand.FirstAnalyse_DataGroup,
			thirdAnalyse: DataGroupCommand.ThirdAnalyse_DataGroup,
			compile: DataGroupCommand.Compile_DataLongGroup,
		});
	}

	private static FirstAnalyse_DataGroup(option: CommandDecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		let expressions: Token[] = line.tag;
		let lines = Commands.CollectBaseLines(option);
		let label = LabelUtils.CreateLabel(expressions[0], option);

		if (!label) {
			line.compileType = LineCompileType.Error;
			return;
		}

		Compiler.enviroment.SetRange(line.command.fileHash, {
			type: "DataGroup",
			key: label.token.text,
			start: option.includeCommandLines![0].line,
			end: option.includeCommandLines![1].line
		});

		let scope = label.token.text.startsWith(".") ? LabelScope.Local : LabelScope.Global;
		let hash = LabelUtils.GetLebalHash(label.token.text, label.token.fileHash, scope);

		label.labelType = LabelType.Label;
		line.label = label;
		let datagroup = new IDataGroup();
		Compiler.enviroment.allDataGroup.set(hash, datagroup);

		for (let i = 0; i < lines.length; i++) {
			const tempLine = lines[i];
			let temp = tempLine.orgText.Split(/\,/g);

			if (temp[temp.length - 1].isEmpty)
				temp.splice(temp.length - 1, 1);

			for (let j = 0; j < temp.length; j++) {
				const p = temp[j];
				let temp2 = ExpressionUtils.SplitAndSort(p);
				if (temp2) {
					line.expParts[j] = temp2;
				} else {
					line.expParts[j] = [];
					line.compileType = LineCompileType.Error;
				}

			}
		}
		line.tag = datagroup;
	}

	private static ThirdAnalyse_DataGroup(option: DecodeOption) {
		const line = option.allLines[option.lineIndex] as ICommandLine;
		const datagroup: IDataGroup = line.tag;
		for (let i = 0; i < line.expParts.length; ++i) {
			let temp = ExpressionUtils.CheckLabelsAndShowError(line.expParts[i]);
			if (temp) {
				line.compileType = LineCompileType.Error;
			} else {
				for (let j = 0; j < line.expParts[i].length; ++j) {
					const part = line.expParts[i][j];
					if (part.type === PriorityType.Level_1_Label)
						datagroup.PushData(part.token, i);
				}
			}
		}
	}

	private static Compile_DataByteGroup(option: DecodeOption) {
		return DataGroupCommand.Compile_DataGroup(option, 1);
	}

	private static Compile_DataWordGroup(option: DecodeOption) {
		return DataGroupCommand.Compile_DataGroup(option, 2);
	}

	private static Compile_DataLongGroup(option: DecodeOption) {
		return DataGroupCommand.Compile_DataGroup(option, 4);
	}

	private static Compile_DataGroup(option: DecodeOption, dataLength: number) {
		const line = option.allLines[option.lineIndex] as ICommandLine;

		if (Commands.SetOrgAddressAndLabel(line))
			return;

		line.result ??= [];
		line.result.length = line.expParts.length * dataLength;
		line.compileType = LineCompileType.Finished;

		let index = 0;
		let finalCompile = Compiler.isLastCompile ? ExpressionResult.GetResultAndShowError : ExpressionResult.TryToGetResult;

		for (let i = 0; i < line.expParts.length; i++) {
			const lex = line.expParts[i];
			let temp = ExpressionUtils.GetExpressionValue(lex, finalCompile, option);
			if (!temp.success) {
				break;
			} else {
				let byteLength = Utils.GetNumberByteLength(temp.value);
				let tempValue = Compiler.SetResult(line, temp.value, index, dataLength);
				if (temp.value < 0 || byteLength > dataLength) {
					let token = ExpressionUtils.CombineExpressionPart(lex);
					let errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.value, tempValue);
					MyDiagnostic.PushWarning(token, errorMsg);
				}
			}
			index += dataLength;
		}

		Compiler.AddAddress(line);
	}



}
