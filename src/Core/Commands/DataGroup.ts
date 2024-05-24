import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils, PriorityType } from "../Base/ExpressionUtils";
import { ILabel, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption, IncludeLine } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

//#region 数据组
/**
 * 数据组
 */
export class DataGroup {

	/**数据组的标签 */
	label!: ILabel;
	/**key是标签是文本 */
	labelAndIndex: Map<string, { token: Token, index: number }[]> = new Map();

	PushData(token: Token, index: number) {
		const labelMap = this.labelAndIndex.get(token.text) ?? [];
		labelMap.push({ token, index });
		this.labelAndIndex.set(token.text, labelMap);
	}

	/**
	 * 查找数据
	 * @param text 文本
	 * @param index 查找的Index
	 * @returns 
	 */
	FindData(text: string, index: number) {
		const labelMap = this.labelAndIndex.get(text);
		if (!labelMap)
			return;

		return labelMap[index];
	}
}
//#endregion 数据组

interface DataGroupTag {
	label: ILabel;
	notFinished: boolean;
};

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

	private static FirstAnalyse_DataGroup(option: DecodeOption, include?: IncludeLine[]) {
		const line = option.GetCurrectLine<CommandLine>();
		const expressions: Token[] = line.tag;
		const lines = Commands.CollectBaseLines(option, include!);

		const label = LabelUtils.CreateLabel(expressions[0], option, false);
		if (!label) {
			line.compileType = LineCompileType.Error;
			return;
		}

		line.tag = { label, notFinish: true };
		Compiler.enviroment.SetRange(line.command.fileHash, {
			type: "DataGroup",
			key: label.token.text,
			startLine: include![0].line,
			endLine: include![1].line
		});

		label.labelType = LabelType.Label;
		const datagroup = new DataGroup();
		datagroup.label = label;

		Compiler.enviroment.allDataGroup.set(label.token.text, datagroup);

		let dataIndex = 0;
		for (let i = 0; i < lines.length; i++) {
			const tempLine = lines[i];
			const temp = tempLine.orgText.Split(/\,/g);

			if (temp[temp.length - 1].isEmpty)
				temp.splice(temp.length - 1, 1);

			for (let j = 0; j < temp.length; j++, dataIndex++) {
				const p = temp[j];
				const temp2 = ExpressionUtils.SplitAndSort(p);
				if (temp2) {
					line.expression.push(temp2);
					DataGroupCommand.AddExpressionPart(datagroup, temp2, i);
				} else {
					line.expression.push([]);
					line.compileType = LineCompileType.Error;
				}

			}
		}
		line.tag = datagroup;
	}

	private static ThirdAnalyse_DataGroup(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		for (let i = 0; i < line.expression.length; ++i) {
			const exps = line.expression[i];
			const temp = ExpressionUtils.CheckLabelsAndShowError(exps);
			if (temp)
				line.compileType = LineCompileType.Error;

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
		const line = option.GetCurrectLine<CommandLine>();
		if (Commands.SetOrgAddressAndLabel(option))
			return;

		line.result.length = line.expression.length * dataLength;
		line.compileType = LineCompileType.Finished;

		let index = 0;

		for (let i = 0; i < line.expression.length; i++) {
			const lex = line.expression[i];
			const temp = ExpressionUtils.GetExpressionValue<number>(lex, option);
			if (!temp.success) {
				line.compileType = LineCompileType.None;
				break;
			} else {
				const byteLength = Utils.GetNumberByteLength(temp.value);
				const tempValue = line.SetResult(temp.value, index, dataLength);
				if (temp.value < 0 || byteLength > dataLength) {
					const token = ExpressionUtils.CombineExpressionPart(lex);
					const errorMsg = Localization.GetMessage("Expression result is {0}, but compile result is {1}", temp.value, tempValue);
					MyDiagnostic.PushWarning(token, errorMsg);
				}
			}
			index += dataLength;
		}

		line.AddAddress();
	}

	private static AddExpressionPart(datagroup: DataGroup, parts: ExpressionPart[], dataIndex: number) {
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.type !== PriorityType.Level_1_Label)
				continue;

			datagroup.PushData(part.token, dataIndex);
		}
	}
}
