import { Compiler } from "../Base/Compiler";
import { ExpAnalyseOption, ExpressionUtils, Expression } from "../Base/ExpressionUtils";
import { LabelNormal, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption, IncludeLine } from "../Base/Options";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { HighlightToken, HighlightType, LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

export interface EnumDataTag {
	startValue?: number;
	lines: { label: LabelNormal, exps: Expression, length?: number }[];
}

export class EnumData {

	static Initialize() {
		Commands.AddCommand({
			name: ".ENUM", min: 1, label: false, ableMacro: false,
			firstAnalyse: EnumData.FirstAnalyse,
			thirdAnalyse: EnumData.ThirdAnalyse,
			compile: EnumData.Compile,
			end: ".ENDE"
		});
	}

	private static FirstAnalyse(option: DecodeOption, include?: IncludeLine[]) {
		const line = option.GetCurrectLine<CommandLine>();

		Compiler.enviroment.SetRange(
			line.command.fileHash,
			{ type: "Enum", key: "", startLine: include![0].line, endLine: include![1].line }
		);

		const expressions: Token[] = line.tag;
		const temp = ExpressionUtils.SplitAndSort(expressions[0]);
		if (temp) {
			line.expression[0] = temp;
			line.GetTokens = EnumData.GetTokens.bind(line);
		} else {
			line.compileType = LineCompileType.Error;
		}

		const tag: EnumDataTag = { startValue: undefined, lines: [] };

		const lines = Commands.CollectBaseLines(option, include!);
		for (let i = 0; i < lines.length; i++) {
			lines[i].compileType = LineCompileType.Finished;
			const parts = Utils.SplitWithComma(lines[i].orgText, { count: 1 });
			if (parts.length !== 2) {
				const error = Localization.GetMessage("Command arguments error");
				MyDiagnostic.PushException(lines[i].orgText, error);
				continue;
			}

			const label = LabelUtils.CreateLabel(parts[0], option, false) as LabelNormal | undefined;
			if (!label)
				continue;

			label.labelType = LabelType.Defined;
			label.comment = lines[i].comment;
			if (parts[1].isEmpty) {
				const error = Localization.GetMessage("Expression error");
				MyDiagnostic.PushException(parts[1], error);
				continue;
			}

			const exps = ExpressionUtils.SplitAndSort(parts[1]);
			if (!exps) {
				lines[i].compileType = LineCompileType.Error;
				continue;
			}

			tag.lines.push({ label, exps, length: undefined });
		}

		line.tag = tag;
	}

	private static ThirdAnalyse(option: DecodeOption) {
		const commandLinie = option.GetCurrectLine<CommandLine>();
		const tag: EnumDataTag = commandLinie.tag;

		if (ExpressionUtils.CheckLabelsAndShowError(commandLinie.expression[0].parts, option))
			return;

		const analyseOption: ExpAnalyseOption = { analyseType: "Try" };
		const temp = ExpressionUtils.GetValue(commandLinie.expression[0].parts, option, analyseOption);
		if (!temp.success)
			return;

		let startValue = temp.value;
		let unknowValue = false;
		for (let i = 0; i < tag.lines.length; i++) {
			const line = tag.lines[i];
			if (ExpressionUtils.CheckLabelsAndShowError(line.exps.parts, option)) {
				unknowValue = true;
				continue;
			}

			if (!line.label) {
				unknowValue = true;
				continue;
			}

			const temp2 = ExpressionUtils.GetValue(line.exps.parts, option, analyseOption);
			if (unknowValue || !temp2.success) {
				unknowValue = true;
				continue;
			}

			line.label.value = startValue;
			startValue += temp2.value;
		}
	}

	private static Compile(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		const tag: EnumDataTag = line.tag;

		if (tag.startValue === undefined) {
			const temp = ExpressionUtils.GetValue(line.expression[0].parts, option);
			if (!temp.success)
				return;

			tag.startValue = temp.value;
		}

		const lines = tag.lines;
		let startValue = tag.startValue;
		for (let i = 0; i < lines.length; i++) {
			const l = lines[i];
			if (l.length !== undefined) {
				startValue += l.length;
				continue;
			}

			const label = l.label
			if (!label)
				return;

			const temp = ExpressionUtils.GetValue(l.exps.parts, option);
			if (!temp.success)
				return;

			const value = temp.value;
			label.value = startValue;
			l.length = value;
			startValue += value;
		}
	}

	private static GetTokens(this: CommandLine) {
		const tag: EnumDataTag = this.tag;

		const result: HighlightToken[] = [];
		result.push(...ExpressionUtils.GetHighlightingTokens(this.expression));

		for (let i = 0; i < tag.lines.length; i++) {
			const line = tag.lines[i];
			result.push({ type: HighlightType.Defined, token: line.label.token });
			result.push(...ExpressionUtils.GetHighlightingTokens([line.exps]));
		}

		return result;
	}

}